from datetime import datetime, date, timezone
from typing import List, Optional
from app.models.task import TaskInDB, TaskStatus
from app.models.focus import FocusSessionInDB
from app.models.review import DailyReviewInDB
from app.models.user import UserInDB
from app.agents.provider import AIProviderService


class ReviewAndInsightsAgent:
    """
    Agent 4: Daily Review and Learning Agent.
    Synthesizes end-of-day retrospectives, detects estimation bias,
    and derives actionable recommendations for tomorrow.
    """

    @classmethod
    async def generate_daily_review(
        cls,
        user: UserInDB,
        review_date: date,
        tasks: List[TaskInDB],
        focus_sessions: List[FocusSessionInDB],
        user_api_key: Optional[str] = None
    ) -> DailyReviewInDB:
        day_str = review_date.isoformat()

        # Tasks completed today
        completed_today = [
            t for t in tasks
            if t.status == TaskStatus.COMPLETED and t.completed_at and t.completed_at.date() == review_date
        ]
        pending = [t for t in tasks if t.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]]

        # Missed deadlines
        missed_deadlines = [
            t.title for t in tasks
            if t.status != TaskStatus.COMPLETED and t.due_date and t.due_date.date() <= review_date
        ]

        # Time totals
        planned_mins = sum(t.estimated_duration for t in completed_today)
        actual_mins = sum(t.actual_duration for t in completed_today)
        focus_mins = sum(s.actual_duration for s in focus_sessions if s.started_at and s.started_at.date() == review_date)

        # Achievements
        achievements = [f"Completed '{t.title}' ({t.actual_duration or t.estimated_duration} mins)" for t in completed_today]
        if focus_mins >= 60:
            achievements.append(f"Logged {focus_mins} minutes of deep focus time.")
        if not achievements:
            achievements.append("Maintained presence and tracked workflow progress.")

        # Productivity Score (0-100)
        task_score = min(len(completed_today) * 20, 60)
        focus_score = min(int(focus_mins / 2), 40)
        total_score = min(task_score + focus_score, 100)

        # Insights & tomorrow improvements
        insights = []
        improvements = []

        if actual_mins > planned_mins * 1.3 and planned_mins > 0:
            diff = actual_mins - planned_mins
            insights.append(f"Tasks took {diff}m longer than planned. Estimation bias detected.")
            improvements.append("Add a 20% buffer to task duration estimates tomorrow.")
        elif completed_today:
            insights.append("Pacing was well balanced across allocated slots.")

        if missed_deadlines:
            insights.append(f"Attention needed: {len(missed_deadlines)} task(s) passed their deadline.")
            improvements.append(f"Schedule '{missed_deadlines[0]}' first thing tomorrow morning.")
        else:
            improvements.append("Select your 3 non-negotiable 'Must Do' tasks before beginning the day.")

        return DailyReviewInDB(
            user_id=user.id or "",
            review_date=day_str,
            tasks_completed=len(completed_today),
            tasks_remaining=len(pending),
            planned_minutes=planned_mins,
            actual_minutes=actual_mins,
            focus_minutes=focus_mins,
            productivity_score=total_score,
            achievements=achievements,
            missed_deadlines=missed_deadlines,
            insights=insights,
            improvements_for_tomorrow=improvements
        )
