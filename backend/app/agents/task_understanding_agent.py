import re
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from app.models.task import PriorityLevel, RecurrenceRule
from app.schemas.task import NaturalLanguageTaskParsed
from app.agents.provider import AIProviderService


class TaskUnderstandingAgent:
    """
    Agent 1: Task Understanding Agent.
    Parses natural language instructions into validated structured task entities.
    """

    @classmethod
    async def parse_natural_language_task(
        cls,
        prompt: str,
        user_timezone: str = "UTC",
        now: Optional[datetime] = None,
        user_api_key: Optional[str] = None
    ) -> NaturalLanguageTaskParsed:
        if now is None:
            now = datetime.now(timezone.utc)

        # 1. Attempt LLM extraction if an API key is available
        llm_system = (
            "You are an expert task parsing agent. Extract task attributes from user speech/text into strict JSON. "
            "Output JSON with keys: title, description, category, priority (critical, high, medium, low), "
            "estimated_duration (integer in minutes), due_date (ISO 8601 string or null), "
            "preferred_time (string like 'morning', 'afternoon', '15:00', or null), "
            "energy_level (high, medium, low), recurrence (none, daily, weekdays, weekly, monthly), "
            "clarification_needed (string or null). Only return JSON."
        )
        
        user_prompt = f"Current UTC Time: {now.isoformat()}\nUser Input: '{prompt}'"
        llm_response = await AIProviderService.generate_text(
            prompt=user_prompt,
            system_instruction=llm_system,
            user_api_key=user_api_key
        )

        if llm_response:
            try:
                # Clean JSON code blocks if present
                clean_json = re.sub(r"^```json\s*|\s*```$", "", llm_response.strip(), flags=re.MULTILINE)
                data = json.loads(clean_json)
                
                due_parsed = None
                if data.get("due_date"):
                    try:
                        due_parsed = datetime.fromisoformat(data["due_date"].replace("Z", "+00:00"))
                    except Exception:
                        pass

                return NaturalLanguageTaskParsed(
                    title=data.get("title", prompt),
                    description=data.get("description", ""),
                    category=data.get("category", cls._guess_category(prompt)),
                    priority=PriorityLevel(data.get("priority", "medium")),
                    estimated_duration=int(data.get("estimated_duration", 30)),
                    due_date=due_parsed,
                    preferred_time=data.get("preferred_time"),
                    energy_level=data.get("energy_level", "medium"),
                    recurrence=RecurrenceRule(data.get("recurrence", "none")),
                    confidence=0.98,
                    clarification_needed=data.get("clarification_needed")
                )
            except Exception:
                pass

        # 2. Deterministic Temporal Heuristic NLP Engine (Reliable Fallback)
        return cls._heuristic_parse(prompt, now)

    @classmethod
    def _heuristic_parse(cls, prompt: str, now: datetime) -> NaturalLanguageTaskParsed:
        text = prompt.strip()
        lower = text.lower()

        # Duration extraction (e.g. "for 2 hours", "for two hours", "90 minutes", "30 mins", "1 hr", "2h", "half an hour")
        duration = 45  # default
        word_numbers = {
            "half an": 0.5, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
        }
        
        # Check digit hours
        dur_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b', lower)
        if dur_match:
            duration = int(float(dur_match.group(1)) * 60)
        else:
            # Check word hours
            word_hour_match = re.search(r'\b(half an|one|two|three|four|five|six)\s*(?:hours?|hrs?)\b', lower)
            if word_hour_match:
                duration = int(word_numbers.get(word_hour_match.group(1), 1) * 60)
            else:
                min_match = re.search(r'(\d+)\s*(?:minutes?|mins?|m)\b', lower)
                if min_match:
                    duration = int(min_match.group(1))

        # Due Date & Time extraction
        due_date = None
        preferred_time = None

        if "tomorrow" in lower:
            due_date = now + timedelta(days=1)
        elif "today" in lower or "tonight" in lower:
            due_date = now
        elif "next week" in lower:
            due_date = now + timedelta(days=7)
        elif "friday" in lower:
            days_ahead = (4 - now.weekday()) % 7
            due_date = now + timedelta(days=days_ahead if days_ahead > 0 else 7)
        elif "monday" in lower:
            days_ahead = (0 - now.weekday()) % 7
            due_date = now + timedelta(days=days_ahead if days_ahead > 0 else 7)

        # Check for specific time like "at 3 pm", "at 15:00", "before 5 PM"
        time_match = re.search(r'\b(?:at|before|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b', lower)
        if time_match:
            hr = int(time_match.group(1))
            mn = int(time_match.group(2) or 0)
            ampm = time_match.group(3)
            if ampm == "pm" and hr < 12:
                hr += 12
            elif ampm == "am" and hr == 12:
                hr = 0
            
            preferred_time = f"{hr:02d}:{mn:02d}"
            if due_date is None:
                due_date = now
            due_date = due_date.replace(hour=hr, minute=mn, second=0, microsecond=0)
        elif due_date:
            due_date = due_date.replace(hour=18, minute=0, second=0, microsecond=0)

        # Priority extraction
        priority = PriorityLevel.MEDIUM
        if any(w in lower for w in ["urgent", "asap", "critical", "immediately", "highest priority"]):
            priority = PriorityLevel.CRITICAL
        elif any(w in lower for w in ["high priority", "important", "exam", "presentation", "deadline"]):
            priority = PriorityLevel.HIGH
        elif any(w in lower for w in ["low priority", "when free", "optional", "someday"]):
            priority = PriorityLevel.LOW

        # Category
        category = cls._guess_category(lower)

        # Energy Level
        energy = "medium"
        if any(w in lower for w in ["study", "code", "leetcode", "design", "exam", "math", "analysis", "complex"]):
            energy = "high"
        elif any(w in lower for w in ["email", "call", "errand", "read", "clean", "organize"]):
            energy = "low"

        # Recurrence
        recurrence = RecurrenceRule.NONE
        if "every day" in lower or "daily" in lower:
            recurrence = RecurrenceRule.DAILY
        elif "every weekday" in lower:
            recurrence = RecurrenceRule.WEEKDAYS
        elif "every week" in lower or "weekly" in lower:
            recurrence = RecurrenceRule.WEEKLY

        # Clean title by removing timing clauses
        title = prompt
        title = re.sub(r'\bfor\s+(?:\d+(?:\.\d+)?|two|three|four|one|five|six|half an)\s*(?:hours?|hrs?|minutes?|mins?)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\b(?:at|before|by)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\b(?:tomorrow|today|tonight|this week|next week)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\s+', ' ', title).strip(" .,-")
        if not title:
            title = prompt

        return NaturalLanguageTaskParsed(
            title=title.capitalize(),
            description=f"Created via TaskFlow NLP: '{prompt}'",
            category=category,
            priority=priority,
            estimated_duration=duration,
            due_date=due_date,
            preferred_time=preferred_time,
            energy_level=energy,
            recurrence=recurrence,
            confidence=0.92
        )

    @staticmethod
    def _guess_category(text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["study", "notes", "dbms", "lecture", "revision", "exam", "assignment", "probability", "course"]):
            return "study"
        if any(w in t for w in ["leetcode", "coding", "python", "bug", "git", "feature", "app", "code", "frontend", "backend"]):
            return "coding"
        if any(w in t for w in ["meeting", "presentation", "client", "work", "project", "report", "sprint"]):
            return "work"
        if any(w in t for w in ["workout", "gym", "meditate", "run", "health", "doctor", "water", "sleep"]):
            return "health"
        if any(w in t for w in ["groceries", "buy", "clean", "errand", "laundry", "call", "bill"]):
            return "errand"
        return "personal"
