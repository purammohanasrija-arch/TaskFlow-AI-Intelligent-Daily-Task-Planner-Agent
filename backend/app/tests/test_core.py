import pytest
from datetime import datetime, date, timedelta, timezone
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.task import TaskInDB, PriorityLevel, TaskStatus
from app.models.user import UserInDB, WorkingHours, UserPreferences, FixedCommitment
from app.models.schedule import ScheduleBlockInDB, BlockType, PlanningMode, BlockStatus
from app.services.prioritization_service import PrioritizationService
from app.services.scheduling_engine import SchedulingEngine
from app.services.replanning_engine import ReplanningEngine
from app.agents.task_understanding_agent import TaskUnderstandingAgent


def test_password_and_jwt_security():
    password = "SuperSecurePassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    # JWT
    token = create_access_token({"sub": "user_123", "email": "test@example.com"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user_123"
    assert payload["email"] == "test@example.com"


def test_prioritization_engine():
    now = datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    
    # Critical overdue task
    overdue_task = TaskInDB(
        user_id="user_1",
        title="Emergency Fix",
        priority=PriorityLevel.CRITICAL,
        importance=5,
        urgency=5,
        due_date=now - timedelta(hours=2),
        estimated_duration=30
    )
    score, bucket = PrioritizationService.calculate_priority_score(overdue_task, now=now)
    assert score >= 80.0
    assert bucket == "critical_urgent"

    # Quick win task
    quick_task = TaskInDB(
        user_id="user_1",
        title="Reply to quick email",
        priority=PriorityLevel.LOW,
        importance=2,
        urgency=2,
        estimated_duration=10
    )
    score_q, bucket_q = PrioritizationService.calculate_priority_score(quick_task, now=now)
    assert bucket_q == "quick_win"


def test_scheduling_engine_generation():
    test_user = UserInDB(
        _id="user_1",
        email="alex@example.com",
        name="Alex",
        password_hash="...",
        working_hours=WorkingHours(
            start_time="09:00",
            end_time="17:00",
            work_days=[0, 1, 2, 3, 4],
            fixed_commitments=[
                FixedCommitment(title="Team Standup", start_time="10:00", end_time="10:30")
            ]
        ),
        preferences=UserPreferences(preferred_break_duration=15)
    )

    t1 = TaskInDB(
        _id="task_1",
        user_id="user_1",
        title="DBMS Notes",
        estimated_duration=60,
        priority=PriorityLevel.HIGH,
        priority_score=85.0
    )
    t2 = TaskInDB(
        _id="task_2",
        user_id="user_1",
        title="LeetCode Practice",
        estimated_duration=45,
        priority=PriorityLevel.MEDIUM,
        priority_score=70.0
    )

    plan_date = date(2025, 1, 15)
    blocks, unscheduled, conflicts, rationale = SchedulingEngine.generate_schedule(
        user=test_user,
        tasks=[t1, t2],
        plan_date=plan_date,
        mode=PlanningMode.BALANCED
    )

    assert len(blocks) >= 3  # Team standup + t1 + t2
    assert any(b.title == "Team Standup" and b.is_fixed for b in blocks)
    assert any(b.title == "DBMS Notes" for b in blocks)
    assert any(b.title == "LeetCode Practice" for b in blocks)
    assert len(unscheduled) == 0


def test_replanning_engine_preserves_completed():
    test_user = UserInDB(
        _id="user_1",
        email="alex@example.com",
        name="Alex",
        password_hash="...",
        working_hours=WorkingHours(start_time="09:00", end_time="18:00")
    )

    plan_date = date(2025, 1, 15)
    t_start = datetime(2025, 1, 15, 9, 0, tzinfo=timezone.utc)
    t_mid = datetime(2025, 1, 15, 10, 0, tzinfo=timezone.utc)
    t_end = datetime(2025, 1, 15, 11, 0, tzinfo=timezone.utc)

    block1 = ScheduleBlockInDB(
        _id="b1",
        user_id="user_1",
        task_id="t1",
        title="Completed Task 1",
        start_time=t_start,
        end_time=t_mid,
        status=BlockStatus.COMPLETED,
        plan_date="2025-01-15"
    )
    block2 = ScheduleBlockInDB(
        _id="b2",
        user_id="user_1",
        task_id="t2",
        title="Delayed Task 2",
        start_time=t_mid,
        end_time=t_end,
        status=BlockStatus.SCHEDULED,
        plan_date="2025-01-15"
    )

    # Replanning at 11:30 (user missed block 2)
    cur_time = datetime(2025, 1, 15, 11, 30, tzinfo=timezone.utc)
    new_blocks, changes, explanation = ReplanningEngine.replan_day(
        user=test_user,
        current_blocks=[block1, block2],
        tasks=[],
        current_time=cur_time
    )

    # Block 1 must be preserved
    assert any(b.title == "Completed Task 1" and b.status == BlockStatus.COMPLETED for b in new_blocks)
    # Block 2 must be shifted to after cur_time
    delayed_block = next(b for b in new_blocks if b.title == "Delayed Task 2")
    assert delayed_block.start_time >= cur_time


@pytest.mark.asyncio
async def test_natural_language_parser():
    now = datetime(2025, 1, 15, 10, 0, tzinfo=timezone.utc)
    parsed = await TaskUnderstandingAgent.parse_natural_language_task(
        prompt="Complete DBMS notes for two hours tomorrow at 3 PM",
        now=now
    )
    assert "dbms notes" in parsed.title.lower()
    assert parsed.estimated_duration == 120
    assert parsed.due_date is not None
    assert parsed.preferred_time == "15:00"
    assert parsed.category == "study"
