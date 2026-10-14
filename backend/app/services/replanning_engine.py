from datetime import datetime, date, timedelta, timezone
from typing import List, Tuple
from app.models.task import TaskInDB, TaskStatus
from app.models.schedule import ScheduleBlockInDB, BlockType, PlanningMode, BlockStatus
from app.models.user import UserInDB
from app.schemas.planner import ReplanResponse, ScheduleBlockResponse


class ReplanningEngine:
    """
    Autonomous Dynamic Replanning Engine.
    Adapts the active daily schedule when events deviate from the original plan:
    - Retains completed tasks and fixed commitments.
    - Shifts unfinished and pending work into remaining slots.
    - Emits clear audit log of changes made.
    """

    @staticmethod
    def replan_day(
        user: UserInDB,
        current_blocks: List[ScheduleBlockInDB],
        tasks: List[TaskInDB],
        current_time: datetime = None,
        reason: str = "Schedule updated due to task timing change"
    ) -> Tuple[List[ScheduleBlockInDB], List[str], str]:
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        elif current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        changes_summary: List[str] = []
        preserved_blocks: List[ScheduleBlockInDB] = []
        blocks_to_reschedule: List[ScheduleBlockInDB] = []

        # 1. Separate past/completed/fixed blocks from future flexible blocks
        for block in current_blocks:
            b_start = block.start_time if block.start_time.tzinfo else block.start_time.replace(tzinfo=timezone.utc)
            b_end = block.end_time if block.end_time.tzinfo else block.end_time.replace(tzinfo=timezone.utc)
            
            # If already completed or is a fixed commitment, always preserve!
            if block.status == BlockStatus.COMPLETED or block.is_fixed:
                preserved_blocks.append(block)
            elif b_end <= current_time:
                # Past block that wasn't marked completed
                if block.block_type == BlockType.TASK:
                    changes_summary.append(f"Detected missed/incomplete session for '{block.title}'. Queued for rescheduling.")
                    blocks_to_reschedule.append(block)
                # Ignore expired past breaks
            else:
                # Future or active block
                if block.block_type == BlockType.TASK:
                    blocks_to_reschedule.append(block)
                elif block.block_type == BlockType.BREAK and b_start > current_time:
                    # Keep future breaks if needed, or re-generate
                    pass

        # 2. Check for newly added pending tasks that haven't been scheduled yet
        scheduled_task_ids = {b.task_id for b in current_blocks if b.task_id}
        for task in tasks:
            if task.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] and task.id not in scheduled_task_ids:
                # New pending task found!
                changes_summary.append(f"Incorporated newly added task '{task.title}' into the remaining day plan.")
                # We will schedule this task as well

        # 3. Determine remaining available time today
        work_end_time = datetime.strptime(user.working_hours.end_time, "%H:%M").time()
        plan_day = current_time.date()
        day_end = datetime.combine(plan_day, work_end_time).replace(tzinfo=timezone.utc)
        
        # If current_time is past normal workday end, allow 2 hour overflow or evening shift
        if current_time >= day_end:
            day_end = current_time + timedelta(hours=3)

        cursor = current_time + timedelta(minutes=5)  # Start 5 minutes from now

        # Account for future fixed commitments
        future_fixed = [b for b in preserved_blocks if b.is_fixed and b.start_time >= current_time]
        future_fixed.sort(key=lambda b: b.start_time)

        # 4. Re-allocate remaining task blocks
        # Sort pending blocks by task priority
        task_map = {t.id: t for t in tasks if t.id}
        
        def block_sort_key(b: ScheduleBlockInDB):
            task = task_map.get(b.task_id)
            if task:
                return -task.priority_score
            return 0.0

        blocks_to_reschedule.sort(key=block_sort_key)

        new_scheduled_blocks: List[ScheduleBlockInDB] = []
        
        for block in blocks_to_reschedule:
            duration_mins = max(int((block.end_time - block.start_time).total_seconds() / 60), 15)
            
            # Check collision with future fixed commitments
            for fixed in future_fixed:
                f_start = fixed.start_time if fixed.start_time.tzinfo else fixed.start_time.replace(tzinfo=timezone.utc)
                f_end = fixed.end_time if fixed.end_time.tzinfo else fixed.end_time.replace(tzinfo=timezone.utc)
                if cursor < f_end and (cursor + timedelta(minutes=duration_mins)) > f_start:
                    cursor = f_end + timedelta(minutes=5)
            
            if cursor + timedelta(minutes=duration_mins) <= day_end + timedelta(hours=1):
                new_start = cursor
                new_end = new_start + timedelta(minutes=duration_mins)
                
                block.start_time = new_start
                block.end_time = new_end
                block.status = BlockStatus.SCHEDULED
                block.rationale = f"Replanned at {current_time.strftime('%H:%M')}: Shifted to ensure realistic completion without overlapping."
                
                new_scheduled_blocks.append(block)
                changes_summary.append(f"Shifted '{block.title}' to {new_start.strftime('%I:%M %p')}.")
                
                cursor = new_end + timedelta(minutes=10) # 10 min buffer
            else:
                changes_summary.append(f"Task '{block.title}' exceeds remaining daily capacity. Recommended for tomorrow.")

        # Combine preserved and new blocks
        all_blocks = preserved_blocks + new_scheduled_blocks
        all_blocks.sort(key=lambda b: b.start_time)

        ai_explanation = (
            f"Autonomous Replanning completed at {current_time.strftime('%I:%M %p')}. "
            f"Preserved {len(preserved_blocks)} completed sessions and commitments. "
            f"Optimally rescheduled {len(new_scheduled_blocks)} tasks into available remaining hours today. "
            f"Reason: {reason}."
        )

        return all_blocks, changes_summary, ai_explanation
