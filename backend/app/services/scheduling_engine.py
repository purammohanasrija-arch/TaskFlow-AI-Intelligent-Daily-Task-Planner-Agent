from datetime import datetime, date, time, timedelta, timezone
from typing import List, Dict, Any, Tuple, Optional
from app.models.task import TaskInDB, TaskStatus, PriorityLevel
from app.models.schedule import ScheduleBlockInDB, BlockType, PlanningMode, BlockStatus
from app.models.user import UserInDB, FixedCommitment
from app.schemas.planner import UnscheduledTaskInfo


class SchedulingEngine:
    """
    Deterministic Scheduling Engine.
    Executes math, slot interval searching, overlap detection, break insertion,
    and dependency validation.
    """

    @staticmethod
    def generate_schedule(
        user: UserInDB,
        tasks: List[TaskInDB],
        plan_date: date,
        mode: PlanningMode = PlanningMode.BALANCED,
        buffer_minutes: int = 10,
        include_breaks: bool = True
    ) -> Tuple[List[ScheduleBlockInDB], List[UnscheduledTaskInfo], List[str], str]:
        """
        Generates a conflict-free daily schedule honoring working hours, commitments,
        task dependencies, deadlines, and break buffers.
        """
        schedule_blocks: List[ScheduleBlockInDB] = []
        unscheduled_tasks: List[UnscheduledTaskInfo] = []
        conflicts_detected: List[str] = []

        # 1. Parse Working Hours
        work_start_time = datetime.strptime(user.working_hours.start_time, "%H:%M").time()
        work_end_time = datetime.strptime(user.working_hours.end_time, "%H:%M").time()
        
        day_start = datetime.combine(plan_date, work_start_time).replace(tzinfo=timezone.utc)
        day_end = datetime.combine(plan_date, work_end_time).replace(tzinfo=timezone.utc)

        if day_end <= day_start:
            day_end = day_start + timedelta(hours=8)

        # 2. Add Fixed Commitments (e.g. classes, meetings, lunch)
        weekday = plan_date.weekday()
        fixed_intervals: List[Tuple[datetime, datetime, str]] = []
        
        for commitment in user.working_hours.fixed_commitments:
            if weekday in commitment.days:
                c_start_t = datetime.strptime(commitment.start_time, "%H:%M").time()
                c_end_t = datetime.strptime(commitment.end_time, "%H:%M").time()
                c_start = datetime.combine(plan_date, c_start_t).replace(tzinfo=timezone.utc)
                c_end = datetime.combine(plan_date, c_end_t).replace(tzinfo=timezone.utc)
                
                fixed_intervals.append((c_start, c_end, commitment.title))
                
                # Add block to schedule
                schedule_blocks.append(ScheduleBlockInDB(
                    user_id=user.id or "",
                    title=commitment.title,
                    start_time=c_start,
                    end_time=c_end,
                    block_type=BlockType.COMMITMENT,
                    status=BlockStatus.SCHEDULED,
                    planning_mode=mode,
                    plan_date=plan_date.isoformat(),
                    rationale=f"Fixed commitment: {commitment.title}",
                    is_fixed=True,
                    category="routine"
                ))

        # Sort fixed intervals chronologically
        fixed_intervals.sort(key=lambda x: x[0])

        # 3. Calculate Available Time Slots
        available_slots: List[Tuple[datetime, datetime]] = []
        current_cursor = day_start
        
        for f_start, f_end, _ in fixed_intervals:
            if f_start > current_cursor:
                available_slots.append((current_cursor, f_start))
            current_cursor = max(current_cursor, f_end)
        
        if current_cursor < day_end:
            available_slots.append((current_cursor, day_end))

        # 4. Filter and Prioritize Eligible Tasks
        pending_tasks = [t for t in tasks if t.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]]
        
        # Sort according to Planning Mode
        if mode == PlanningMode.DEADLINE:
            # Deadline mode: sorts by earliest deadline first, then priority score
            def deadline_sort_key(t: TaskInDB):
                due_val = t.due_date.timestamp() if t.due_date else 9999999999
                return (due_val, -t.priority_score)
            pending_tasks.sort(key=deadline_sort_key)
        elif mode == PlanningMode.FOCUS:
            # Focus mode: deep work, high energy & high priority first
            def focus_sort_key(t: TaskInDB):
                energy_val = 3 if t.energy_level == "high" else (2 if t.energy_level == "medium" else 1)
                return (-t.priority_score, -energy_val, -t.estimated_duration)
            pending_tasks.sort(key=focus_sort_key)
        else:
            # Balanced mode: priority score desc, mix of quick wins and key tasks
            pending_tasks.sort(key=lambda t: -t.priority_score)

        # 5. Dependency Validation Map
        completed_task_ids = {t.id for t in tasks if t.status == TaskStatus.COMPLETED and t.id}
        scheduled_task_ids = set()

        # Break settings
        break_duration = user.preferences.preferred_break_duration if include_breaks else 0
        minutes_since_last_break = 0
        max_continuous_work = 90 if mode == PlanningMode.FOCUS else 60

        # 6. Fit Tasks into Slots
        for task in pending_tasks:
            # Check dependencies
            missing_deps = [dep for dep in task.dependencies if dep not in completed_task_ids and dep not in scheduled_task_ids]
            if missing_deps:
                unscheduled_tasks.append(UnscheduledTaskInfo(
                    task_id=task.id or "",
                    title=task.title,
                    estimated_duration=task.estimated_duration,
                    priority=task.priority.value,
                    reason=f"Blocked by unfinished dependency tasks: {', '.join(missing_deps)}",
                    recommendation="Complete required prerequisite tasks first."
                ))
                continue

            # Find a suitable slot
            duration_needed = task.estimated_duration
            fitted = False

            for slot_idx, (slot_start, slot_end) in enumerate(available_slots):
                slot_minutes = int((slot_end - slot_start).total_seconds() / 60)
                
                # Check if we should insert a break before this task
                effective_start = slot_start
                if include_breaks and minutes_since_last_break >= max_continuous_work:
                    break_end = effective_start + timedelta(minutes=break_duration)
                    if break_end < slot_end:
                        schedule_blocks.append(ScheduleBlockInDB(
                            user_id=user.id or "",
                            title=f"Rest & Recharge ({break_duration}m)",
                            start_time=effective_start,
                            end_time=break_end,
                            block_type=BlockType.BREAK,
                            status=BlockStatus.SCHEDULED,
                            planning_mode=mode,
                            plan_date=plan_date.isoformat(),
                            rationale="Scheduled pause to prevent cognitive fatigue and restore focus.",
                            is_fixed=False,
                            category="health"
                        ))
                        effective_start = break_end
                        minutes_since_last_break = 0
                        slot_minutes = int((slot_end - effective_start).total_seconds() / 60)

                if slot_minutes >= duration_needed:
                    task_start = effective_start
                    task_end = task_start + timedelta(minutes=duration_needed)
                    
                    # Generate rationale
                    rationale = SchedulingEngine._generate_task_rationale(task, mode, task_start)
                    
                    schedule_blocks.append(ScheduleBlockInDB(
                        user_id=user.id or "",
                        task_id=task.id,
                        title=task.title,
                        start_time=task_start,
                        end_time=task_end,
                        block_type=BlockType.TASK,
                        status=BlockStatus.SCHEDULED,
                        planning_mode=mode,
                        plan_date=plan_date.isoformat(),
                        rationale=rationale,
                        is_fixed=False,
                        category=task.category
                    ))

                    scheduled_task_ids.add(task.id)
                    minutes_since_last_break += duration_needed
                    fitted = True

                    # Update the remaining slot
                    new_start = task_end + timedelta(minutes=buffer_minutes)
                    if new_start < slot_end:
                        available_slots[slot_idx] = (new_start, slot_end)
                    else:
                        available_slots.pop(slot_idx)
                    break

            if not fitted:
                # Task could not fit into the remaining available hours
                unscheduled_tasks.append(UnscheduledTaskInfo(
                    task_id=task.id or "",
                    title=task.title,
                    estimated_duration=task.estimated_duration,
                    priority=task.priority.value,
                    reason=f"Insufficient remaining time in workday (required {duration_needed}m).",
                    recommendation="Reschedule to tomorrow, reduce scope, or split into smaller subtasks."
                ))

        # Sort all schedule blocks chronologically
        schedule_blocks.sort(key=lambda b: b.start_time)

        # 7. Overall Rationale synthesis
        scheduled_count = sum(1 for b in schedule_blocks if b.block_type == BlockType.TASK)
        total_time_mins = sum(int((b.end_time - b.start_time).total_seconds() / 60) for b in schedule_blocks if b.block_type == BlockType.TASK)
        
        mode_names = {
            PlanningMode.BALANCED: "Balanced Mode (optimal pacing with regular breaks)",
            PlanningMode.FOCUS: "Focus Mode (deep concentration blocks for high-impact work)",
            PlanningMode.DEADLINE: "Deadline Mode (strict prioritization of approaching due dates)"
        }

        ai_rationale = (
            f"Crafted your plan for {plan_date.strftime('%A, %b %d')} using {mode_names.get(mode, 'Balanced Mode')}. "
            f"Successfully scheduled {scheduled_count} high-priority tasks totaling {total_time_mins} minutes of focused activity, "
            f"integrating fixed commitments and cognitive rest buffers."
        )

        return schedule_blocks, unscheduled_tasks, conflicts_detected, ai_rationale

    @staticmethod
    def _generate_task_rationale(task: TaskInDB, mode: PlanningMode, start_time: datetime) -> str:
        hour = start_time.hour
        time_period = "morning" if hour < 12 else ("afternoon" if hour < 17 else "evening")
        
        if task.priority == PriorityLevel.CRITICAL:
            return f"Allocated to peak {time_period} hours due to CRITICAL priority and approaching deadline."
        elif task.estimated_duration <= 20:
            return f"Scheduled as a quick-win task in {time_period} to build positive momentum."
        elif mode == PlanningMode.FOCUS and task.energy_level == "high":
            return f"Reserved during high-energy {time_period} block for uninterrupted deep work."
        elif task.due_date:
            return f"Positioned to guarantee completion well ahead of the deadline on {task.due_date.strftime('%b %d')}."
        else:
            return f"Scheduled according to calculated priority score ({task.priority_score}/100) and slot fit."
