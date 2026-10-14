from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.models.task import TaskInDB, TaskStatus, PriorityLevel
from app.models.schedule import ScheduleBlockInDB, BlockType, BlockStatus
from app.models.user import UserInDB
from app.schemas.assistant import ChatResponse, ProposedAction, ChatMessage
from app.agents.provider import AIProviderService


class ProductivityAssistantAgent:
    """
    Agent: AI Productivity Chat Assistant.
    Provides context-aware coaching, immediate schedule guidance, and proposes
    actionable changes directly grounded in the user's live database.
    """

    @classmethod
    async def chat(
        cls,
        user: UserInDB,
        message: str,
        tasks: List[TaskInDB],
        schedule_blocks: List[ScheduleBlockInDB],
        history: List[ChatMessage],
        now: Optional[datetime] = None,
        user_api_key: Optional[str] = None
    ) -> ChatResponse:
        if now is None:
            now = datetime.now(timezone.utc)

        msg_lower = message.strip().lower()

        # Build authorized context summary
        pending_tasks = [t for t in tasks if t.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]]
        completed_tasks = [t for t in tasks if t.status == TaskStatus.COMPLETED]
        overdue_tasks = [
            t for t in pending_tasks
            if t.due_date and (t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)) < now
        ]

        # 1. Check for LLM generation
        context_str = (
            f"User: {user.name} ({user.preferences.role})\n"
            f"Current Time: {now.strftime('%A, %b %d %I:%M %p')}\n"
            f"Pending Tasks ({len(pending_tasks)}): " + ", ".join([f"'{t.title}' ({t.priority.value}, {t.estimated_duration}m)" for t in pending_tasks[:8]]) + "\n"
            f"Overdue Tasks ({len(overdue_tasks)}): " + ", ".join([t.title for t in overdue_tasks[:4]]) + "\n"
            f"Completed Today ({len(completed_tasks)})\n"
            f"Working Hours: {user.working_hours.start_time} - {user.working_hours.end_time}\n"
        )

        system_instruction = (
            "You are TaskFlow AI, an intelligent daily planning and productivity agent. "
            "Respond concisely with concrete, actionable advice grounded in the user's real task list. "
            "Never give vague platitudes. Suggest specific task names, durations, and priority tradeoffs."
        )

        llm_reply = await AIProviderService.generate_text(
            prompt=f"Context:\n{context_str}\n\nUser Question: '{message}'",
            system_instruction=system_instruction,
            user_api_key=user_api_key
        )

        # 2. Extract proposed actions & quick suggestions
        proposed_actions: List[ProposedAction] = []
        quick_suggestions = [
            "What should I do next?",
            "Plan my day",
            "I have 2 hours left. What can I finish?",
            "Reschedule unfinished tasks"
        ]

        # Detect specific action intents
        if any(w in msg_lower for w in ["plan my day", "generate schedule", "create my plan"]):
            proposed_actions.append(ProposedAction(
                action_type="replan_day",
                description="Generate an optimized schedule for today's pending tasks",
                payload={"mode": user.preferences.planning_mode},
                requires_confirmation=False
            ))
            reply = llm_reply or (
                f"I've analyzed your {len(pending_tasks)} pending tasks and availability. "
                f"You have {len(overdue_tasks)} overdue item{'s' if len(overdue_tasks) > 1 else ''}. "
                "I'm ready to allocate your day with balanced focus blocks and breaks. Click below to generate your plan!"
            )
            return ChatResponse(
                reply=reply,
                proposed_actions=proposed_actions,
                quick_suggestions=["What should I do next?", "Focus on top priority", "Break down my biggest task"],
                agent_used="Planning Orchestrator"
            )

        if any(w in msg_lower for w in ["what should i do next", "next task", "recommendation"]):
            if pending_tasks:
                # Top priority task
                top_task = sorted(pending_tasks, key=lambda t: -t.priority_score)[0]
                reply = llm_reply or (
                    f"Your highest leverage action right now is **'{top_task.title}'** "
                    f"(Category: {top_task.category}, Est: {top_task.estimated_duration} mins, Priority: {top_task.priority.value.upper()}). "
                    f"It has a priority score of {top_task.priority_score}/100. "
                    "Start a 25-minute Pomodoro focus session now to make immediate progress."
                )
                proposed_actions.append(ProposedAction(
                    action_type="start_focus",
                    description=f"Start Pomodoro focus session on '{top_task.title}'",
                    payload={"task_id": top_task.id, "duration": 25},
                    requires_confirmation=False
                ))
            else:
                reply = "You currently have no pending tasks! Enjoy your free time or add a new goal for tomorrow."
            return ChatResponse(
                reply=reply,
                proposed_actions=proposed_actions,
                quick_suggestions=["Plan my day", "Add a new task", "Show productivity analytics"],
                agent_used="Task Recommendation Specialist"
            )

        if "two hours" in msg_lower or "2 hours" in msg_lower or "limited time" in msg_lower:
            # Fit tasks under 120 minutes
            available_time = 120
            fitted = []
            cur_time = 0
            for t in sorted(pending_tasks, key=lambda x: -x.priority_score):
                if cur_time + t.estimated_duration <= available_time:
                    fitted.append(t)
                    cur_time += t.estimated_duration
            
            if fitted:
                fitted_names = "\n".join([f"- **{t.title}** ({t.estimated_duration} mins)" for t in fitted])
                reply = (
                    f"In a 2-hour window, you can realistically knock out these **{len(fitted)} tasks** totaling {cur_time} mins:\n"
                    f"{fitted_names}\n\n"
                    "This targets your highest-impact items without risk of deadline spillover."
                )
            else:
                reply = "Your pending tasks are each longer than 2 hours. I recommend breaking your top task into smaller 30-minute chunks!"
            return ChatResponse(
                reply=reply,
                proposed_actions=[],
                quick_suggestions=["Break down my biggest task", "Start focus session", "Reschedule rest to tomorrow"],
                agent_used="Time-Constraint Optimization Agent"
            )

        if any(w in msg_lower for w in ["reschedule", "replan", "running late", "missed"]):
            proposed_actions.append(ProposedAction(
                action_type="replan_day",
                description="Recalculate remaining schedule and shift delayed tasks",
                payload={"reason": "User requested schedule adjustment"},
                requires_confirmation=True
            ))
            reply = llm_reply or (
                "I can dynamically adapt your schedule: I will preserve all completed sessions, "
                "recalculate the remaining hours today, and shift pending tasks into conflict-free slots. "
                "Would you like me to apply this replanned schedule?"
            )
            return ChatResponse(
                reply=reply,
                proposed_actions=proposed_actions,
                quick_suggestions=["Yes, apply replan", "What should I do next?", "Postpone unfinished to tomorrow"],
                agent_used="Autonomous Replanning Specialist"
            )

        # General response
        if llm_reply:
            reply = llm_reply
        else:
            reply = (
                f"Hello {user.name}! I am monitoring your task flow. "
                f"You currently have {len(pending_tasks)} pending tasks and {len(overdue_tasks)} overdue deadlines. "
                "How would you like to optimize your schedule right now?"
            )

        return ChatResponse(
            reply=reply,
            proposed_actions=proposed_actions,
            quick_suggestions=quick_suggestions,
            agent_used="Central Productivity Assistant"
        )
