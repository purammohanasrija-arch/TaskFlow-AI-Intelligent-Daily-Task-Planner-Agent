import re
import json
from typing import Optional, List
from app.schemas.assistant import GoalBreakdownResponse, SubtaskSuggestion
from app.agents.provider import AIProviderService


class GoalBreakdownAgent:
    """
    Agent: Smart Task Breakdown.
    Deconstructs high-level goals into ordered, manageable subtasks with
    time estimates and verifiable completion criteria.
    """

    @classmethod
    async def breakdown_goal(
        cls,
        goal_title: str,
        goal_description: str = "",
        target_days: int = 7,
        category: str = "study",
        user_api_key: Optional[str] = None
    ) -> GoalBreakdownResponse:
        system_instruction = (
            "You are an expert agile task planner. Deconstruct the user's high-level goal into 4-7 actionable, sequential subtasks. "
            "Output valid JSON with keys: "
            "goal_title (string), overview (concise roadmap summary), "
            "suggested_subtasks (list of objects with: title, estimated_duration (minutes), order (1-indexed), "
            "completion_criteria (tangible proof of done), recommended_day_offset (0 to target_days-1), dependencies (list of titles)). "
            "Only return valid JSON."
        )

        user_prompt = f"Goal: '{goal_title}'\nDescription: '{goal_description}'\nTarget Horizon: {target_days} days\nCategory: {category}"

        llm_response = await AIProviderService.generate_text(
            prompt=user_prompt,
            system_instruction=system_instruction,
            user_api_key=user_api_key
        )

        if llm_response:
            try:
                clean_json = re.sub(r"^```json\s*|\s*```$", "", llm_response.strip(), flags=re.MULTILINE)
                data = json.loads(clean_json)
                
                subtasks = [
                    SubtaskSuggestion(
                        title=st.get("title", f"Subtask {i+1}"),
                        estimated_duration=int(st.get("estimated_duration", 45)),
                        order=int(st.get("order", i+1)),
                        completion_criteria=st.get("completion_criteria", "Complete task deliverables"),
                        recommended_day_offset=int(st.get("recommended_day_offset", 0)),
                        dependencies=st.get("dependencies", [])
                    )
                    for i, st in enumerate(data.get("suggested_subtasks", []))
                ]
                total_hours = sum(st.estimated_duration for st in subtasks) / 60.0
                return GoalBreakdownResponse(
                    goal_title=goal_title,
                    overview=data.get("overview", f"Structured action plan for {goal_title}"),
                    suggested_subtasks=subtasks,
                    total_estimated_hours=round(total_hours, 1)
                )
            except Exception:
                pass

        # Heuristic fallback breakdown generator
        return cls._heuristic_breakdown(goal_title, target_days, category)

    @classmethod
    def _heuristic_breakdown(cls, title: str, target_days: int, category: str) -> GoalBreakdownResponse:
        lower = title.lower()
        subtasks: List[SubtaskSuggestion] = []

        if "dbms" in lower or "database" in lower or "sql" in lower:
            raw = [
                ("Review ER Diagrams & Cardinality Constraints", 45, "Able to design compliant ER schemas without ambiguity"),
                ("Practice Relational Algebra & Tuple Calculus", 60, "Solved 5 core relational algebra expressions correctly"),
                ("Deep-dive Normalization (1NF, 2NF, 3NF, BCNF)", 60, "Able to decompose lossy vs lossless join schemas"),
                ("Hands-on SQL Queries & Index Optimization", 45, "Wrote joins, subqueries, and window functions"),
                ("Solve Past Examination & Benchmark Questions", 90, "Scored >= 85% on practice paper"),
                ("Final Flashcard Review & Edge Case Revision", 30, "Summarized transaction ACID properties & locking")
            ]
        elif "exam" in lower or "study" in lower or "course" in lower:
            raw = [
                (f"Audit Syllabus & Collate Materials for {title}", 30, "Created comprehensive checklist of topics"),
                ("Core Conceptual Review & Flashcard Synthesis", 60, "Summarized foundational chapters into cheat-sheets"),
                ("Active Recall & Practice Problem Set 1", 75, "Completed practice exercises without consulting notes"),
                ("Address Weak Areas & Advanced Deep Dive", 60, "Clarified doubts and re-solved incorrect problems"),
                ("Timed Mock Examination Simulation", 90, "Finished test paper within strict time limit"),
                ("Final High-Yield Revision Session", 45, "Reviewed critical formulas and summaries")
            ]
        elif "leetcode" in lower or "coding" in lower or "dsa" in lower:
            raw = [
                ("Review Core Patterns (Two Pointers & Sliding Window)", 45, "Understood sliding window invariant"),
                ("Solve 2 Medium Problems on Trees & Graphs", 60, "Implemented BFS and DFS with optimal complexity"),
                ("Dynamic Programming Foundations & Memoization", 75, "Identified base cases and recurrence relation"),
                ("Mock Technical Interview / Timed Problem Session", 60, "Explained approach out loud and passed all test suites"),
                ("Analyze Space/Time Complexities & Code Refactoring", 30, "Cleaned edge cases and added comments")
            ]
        elif "presentation" in lower or "slides" in lower or "pitch" in lower:
            raw = [
                ("Outline Core Message, Audience Hook & Narrative Arc", 45, "Approved slide outline with 5-7 key sections"),
                ("Draft Slide Deck Content & Data Visuals", 90, "Completed first visual draft in slide editor"),
                ("Design Polish, Typography & Visual Flow", 45, "Ensured clean aesthetic and high-contrast readability"),
                ("Rehearse Presentation with Stopwatch", 30, "Delivered full talk within target time slot twice"),
                ("Prepare Q&A Talking Points & Backup Slides", 30, "Documented answers to 5 anticipated hard questions")
            ]
        else:
            raw = [
                (f"Scope Requirements & Define Definition of Done for {title}", 30, "Clear criteria and milestones established"),
                ("Phase 1: Research, Architecture & Core Foundations", 60, "Base prototype or draft created"),
                ("Phase 2: Implementation & Deep Execution", 90, "Key deliverables 80% complete"),
                ("Phase 3: Review, Testing & Refinement", 45, "All errors or feedback addressed"),
                ("Phase 4: Final Wrap-up & Retrospective", 30, "Milestone verified and signed off")
            ]

        day_step = max(target_days / len(raw), 1)
        prev_title = None

        for idx, (t, dur, criteria) in enumerate(raw):
            deps = [prev_title] if prev_title else []
            subtasks.append(SubtaskSuggestion(
                title=t,
                estimated_duration=dur,
                order=idx + 1,
                completion_criteria=criteria,
                recommended_day_offset=min(int(idx * day_step), target_days - 1),
                dependencies=deps
            ))
            prev_title = t

        total_hours = sum(st.estimated_duration for st in subtasks) / 60.0
        return GoalBreakdownResponse(
            goal_title=title,
            overview=f"Generated an optimized 6-step breakdown for '{title}' structured for consistent daily progress over {target_days} days.",
            suggested_subtasks=subtasks,
            total_estimated_hours=round(total_hours, 1)
        )
