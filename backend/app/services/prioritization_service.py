from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from app.models.task import TaskInDB, PriorityLevel


class PrioritizationService:
    """
    Deterministic Task Prioritization Engine.
    Uses transparent scoring based on:
    - Deadline proximity
    - Importance & Urgency ratings
    - Effort (quick wins vs deep work)
    - Dependency chain depth
    - User priority level
    """

    @staticmethod
    def calculate_priority_score(
        task: TaskInDB,
        all_tasks: List[TaskInDB] = None,
        now: datetime = None
    ) -> Tuple[float, str]:
        if now is None:
            now = datetime.now(timezone.utc)
        
        score = 0.0
        
        # 1. Base Priority Rating (0-30 pts)
        priority_map = {
            PriorityLevel.CRITICAL: 30.0,
            PriorityLevel.HIGH: 22.0,
            PriorityLevel.MEDIUM: 14.0,
            PriorityLevel.LOW: 6.0
        }
        score += priority_map.get(task.priority, 14.0)

        # 2. Importance and Urgency (0-30 pts)
        importance_score = (task.importance / 5.0) * 15.0
        urgency_score = (task.urgency / 5.0) * 15.0
        score += importance_score + urgency_score

        # 3. Deadline Proximity (0-35 pts)
        if task.due_date:
            due = task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
            delta = due - now
            hours_left = delta.total_seconds() / 3600.0
            
            if hours_left < 0:
                # Overdue! Immediate critical urgency
                score += 35.0
            elif hours_left <= 6:
                score += 32.0
            elif hours_left <= 24:
                score += 26.0
            elif hours_left <= 48:
                score += 18.0
            elif hours_left <= 7 * 24:
                score += 10.0
            else:
                score += 4.0
        else:
            # No deadline
            score += 5.0

        # 4. Effort & Quick-Win Adjustment (0-10 pts)
        # Quick wins (<=20 mins) receive a slight score boost to enable momentum
        if task.estimated_duration <= 20:
            score += 7.0
        elif task.estimated_duration <= 45:
            score += 4.0

        # 5. Dependency Blocker Bonus (0-10 pts)
        # If other tasks depend on this task, completing it unblocks the pipeline
        if all_tasks and task.id:
            dependent_count = sum(1 for t in all_tasks if task.id in t.dependencies)
            if dependent_count > 0:
                score += min(dependent_count * 4.0, 10.0)

        final_score = round(min(max(score, 0.0), 100.0), 1)

        # Categorize into bucket
        bucket = PrioritizationService._determine_bucket(task, final_score, now)
        return final_score, bucket

    @staticmethod
    def _determine_bucket(task: TaskInDB, score: float, now: datetime) -> str:
        # Check deadline urgency
        is_overdue_or_due_soon = False
        if task.due_date:
            due = task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
            hours_left = (due - now).total_seconds() / 3600.0
            if hours_left <= 24:
                is_overdue_or_due_soon = True

        if task.priority == PriorityLevel.CRITICAL or is_overdue_or_due_soon or score >= 75.0:
            return "critical_urgent"
        
        if task.estimated_duration <= 20 and task.importance >= 2:
            return "quick_win"
            
        if task.importance >= 4:
            return "important_not_urgent"
            
        if task.recurrence and task.recurrence != "none":
            return "routine"
            
        if score < 40.0:
            return "optional"
            
        return "important_not_urgent"
