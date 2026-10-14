import os
import json
import logging
from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIProviderService:
    """
    Unified AI Provider abstraction for Google Gemini and Groq.
    Includes automatic graceful fallback to sophisticated deterministic heuristic logic
    whenever API keys are absent, network is unavailable, or rate limits occur.
    """

    @staticmethod
    def get_effective_gemini_key(user_api_key: Optional[str] = None) -> Optional[str]:
        return user_api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")

    @staticmethod
    def get_effective_groq_key(user_api_key: Optional[str] = None) -> Optional[str]:
        return user_api_key or settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")

    @classmethod
    async def generate_text(
        cls,
        prompt: str,
        system_instruction: str = "",
        user_api_key: Optional[str] = None,
        preferred_provider: Optional[str] = None
    ) -> Optional[str]:
        gemini_key = cls.get_effective_gemini_key(user_api_key)
        groq_key = cls.get_effective_groq_key(user_api_key)

        provider = preferred_provider or settings.AI_PROVIDER

        # 1. Try Gemini if configured
        if gemini_key and provider in ["gemini", "auto"]:
            try:
                from google import genai
                from google.genai import types
                
                client = genai.Client(api_key=gemini_key)
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction if system_instruction else None,
                    temperature=0.3
                )
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}. Attempting fallback...")

        # 2. Try Groq if configured
        if groq_key and provider in ["groq", "auto"]:
            try:
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                async with httpx.AsyncClient(timeout=15.0) as http_client:
                    res = await http_client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": settings.GROQ_MODEL,
                            "messages": messages,
                            "temperature": 0.3
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"Groq API call failed: {e}. Falling back to heuristic engine.")

        # Return None to trigger heuristic engine fallback
        return None
