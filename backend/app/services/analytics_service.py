from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from app.models.task import TaskInDB, TaskStatus
from app.models.focus import FocusSessionInDB
from app.schemas.analytics import AnalyticsSummaryResponse, CategoryStat, DailyCompletionTrend


class AnalyticsService:
    """
    Computes transparent productivity metrics, category breakdowns,
    and planned vs actual time analyses.
    """

    @staticmethod
    def compute_summary(
        tasks: List[TaskInDB],
        focus_sessions: List[FocusSessionInDB],
        now: datetime = None
    ) -> AnalyticsSummaryResponse:
        if now is None:
            now = datetime.now(timezone.utc)

        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        pending_tasks = sum(1 for t in tasks if t.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
        
        # Overdue tasks
        overdue_tasks = 0
        for t in tasks:
            if t.status != TaskStatus.COMPLETED and t.due_date:
                due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
                if due < now:
                    overdue_tasks += 1

        completion_rate = round((completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0, 1)

        # Focus time
        total_focus_minutes = sum(s.actual_duration for s in focus_sessions)

        # Category distribution
        category_map: Dict[str, Dict[str, int]] = {}
        planned_total = 0
        actual_total = 0

        for t in tasks:
            cat = t.category or "general"
            if cat not in category_map:
                category_map[cat] = {"completed": 0, "total": 0, "minutes": 0}
            category_map[cat]["total"] += 1
            if t.status == TaskStatus.COMPLETED:
                category_map[cat]["completed"] += 1
            category_map[cat]["minutes"] += t.actual_duration or t.estimated_duration
            
            planned_total += t.estimated_duration
            actual_total += t.actual_duration

        category_stats = [
            CategoryStat(
                category=cat,
                completed_count=data["completed"],
                total_count=data["total"],
                total_minutes=data["minutes"]
            )
            for cat, data in category_map.items()
        ]

        # 7-day daily completion trend
        daily_trends: List[DailyCompletionTrend] = []
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_str = day_date.strftime("%Y-%m-%d")
            
            day_completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED and t.completed_at and t.completed_at.date() == day_date)
            day_focus = sum(s.actual_duration for s in focus_sessions if s.started_at and s.started_at.date() == day_date)
            
            daily_trends.append(DailyCompletionTrend(
                date=day_date.strftime("%a"),
                completed=day_completed,
                pending=pending_tasks if i == 0 else max(0, total_tasks - day_completed),
                focus_minutes=day_focus
            ))

        # Transparent Productivity Score calculation (0 - 100)
        # Components:
        # 1. Completion Rate: 40 pts
        # 2. Overdue Penalty: up to -25 pts
        # 3. Focus Consistency: 25 pts (120 mins = full score)
        # 4. Proactive Planning: 10 pts
        cr_score = (completion_rate / 100.0) * 40.0
        overdue_penalty = min(overdue_tasks * 8.0, 25.0)
        focus_score = min((total_focus_minutes / 120.0) * 25.0, 25.0)
        planning_bonus = 10.0 if total_tasks > 0 else 5.0

        productivity_score = int(round(max(0.0, min(100.0, cr_score + focus_score + planning_bonus - overdue_penalty))))

        score_breakdown = {
            "completion_points": round(cr_score, 1),
            "focus_points": round(focus_score, 1),
            "planning_points": round(planning_bonus, 1),
            "overdue_penalty": round(overdue_penalty, 1),
            "formula": "40% Completion + 25% Focus Time + 10% Planning Activity - Overdue Penalty"
        }

        # Daily recommendation
        if overdue_tasks > 0:
            rec = f"You have {overdue_tasks} overdue task{'s' if overdue_tasks > 1 else ''}. Prioritize clearing these first thing today to regain momentum."
        elif completion_rate >= 80:
            rec = "Superb execution today! All core milestones are on track. Take time for an intentional evening unwind."
        elif total_focus_minutes < 25:
            rec = "Start a 25-minute Pomodoro focus session on your highest priority task to build flow."
        else:
            rec = f"You're in a great rhythm with {int(total_focus_minutes)} minutes of logged focus. Keep knocking out key items!"

        return AnalyticsSummaryResponse(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
            overdue_tasks=overdue_tasks,
            completion_rate=completion_rate,
            total_focus_minutes=total_focus_minutes,
            productivity_score=productivity_score,
            score_breakdown=score_breakdown,
            category_distribution=category_stats,
            daily_trends=daily_trends,
            planned_vs_actual_minutes={"planned": planned_total, "actual": actual_total},
            daily_recommendation=rec
        )
