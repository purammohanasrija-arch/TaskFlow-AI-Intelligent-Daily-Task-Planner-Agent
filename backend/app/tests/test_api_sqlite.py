import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_full_api_flow_with_sqlite():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Root check
        res_root = await client.get("/")
        assert res_root.status_code == 200
        assert res_root.json()["status"] == "online"

        # 3. Register user with unique email
        unique_email = f"sqlite_user_{uuid.uuid4().hex[:8]}@example.com"
        register_data = {
            "name": "SQLite Test User",
            "email": unique_email,
            "password": "Password123!",
            "role": "developer",
            "timezone": "UTC"
        }
        res_reg = await client.post("/api/auth/register", json=register_data)
        assert res_reg.status_code == 200
        token_data = res_reg.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 4. Get Current User profile
        res_me = await client.get("/api/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["email"] == unique_email

        # 5. Create a Task
        task_data = {
            "title": "Complete Backend SQLite Migration",
            "description": "Ensure SQLite works completely without external MongoDB",
            "category": "coding",
            "priority": "high",
            "estimated_duration": 45,
            "subtasks": [
                {"title": "Implement SQLite document engine", "estimated_duration": 20},
                {"title": "Verify query operations", "estimated_duration": 25}
            ]
        }
        res_task = await client.post("/api/tasks", json=task_data, headers=headers)
        assert res_task.status_code == 201
        created_task = res_task.json()
        assert created_task["title"] == "Complete Backend SQLite Migration"
        task_id = created_task["id"]

        # 6. List Tasks
        res_tasks = await client.get("/api/tasks", headers=headers)
        assert res_tasks.status_code == 200
        tasks_list = res_tasks.json()
        assert len(tasks_list) >= 1
        assert any(t["id"] == task_id for t in tasks_list)

        # 7. Generate Daily Schedule
        res_plan = await client.post("/api/planner/generate", json={"plan_date": "2026-10-15", "mode": "balanced"}, headers=headers)
        assert res_plan.status_code == 200
        plan_data = res_plan.json()
        assert "blocks" in plan_data
        assert "ai_rationale" in plan_data

        # 8. Start & Finish Focus Session
        res_start_focus = await client.post("/api/focus/start", json={"task_id": task_id, "target_duration": 25, "session_type": "work"}, headers=headers)
        assert res_start_focus.status_code in [200, 201]
        session_id = res_start_focus.json()["id"]

        res_complete_focus = await client.post("/api/focus/finish", json={"session_id": session_id, "actual_duration": 25, "status": "completed"}, headers=headers)
        assert res_complete_focus.status_code == 200

        # Complete task
        res_comp_task = await client.patch(f"/api/tasks/{task_id}", json={"status": "completed"}, headers=headers)
        assert res_comp_task.status_code == 200

        # 9. Analytics Summary
        res_analytics = await client.get("/api/analytics/summary", headers=headers)
        assert res_analytics.status_code == 200
        analytics = res_analytics.json()
        assert "productivity_score" in analytics
        assert analytics["completed_tasks"] >= 1
        assert analytics["total_focus_minutes"] >= 25
