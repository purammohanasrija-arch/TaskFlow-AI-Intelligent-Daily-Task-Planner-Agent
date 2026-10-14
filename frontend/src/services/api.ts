import {
  User, Task, PlanData, FocusSession, AnalyticsSummary,
  ChatMessage, GoalBreakdownResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('taskflow_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('taskflow_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('taskflow_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.removeToken();
      // Only redirect if not already on login/landing
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.dispatchEvent(new Event('taskflow:unauthorized'));
      }
    }

    if (!response.ok) {
      let errorMsg = 'An unexpected error occurred';
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // --- Auth ---
  async register(data: any): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(data: any): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateMe(data: any): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  logout(): void {
    this.removeToken();
  }

  // --- Tasks ---
  async getTasks(params?: { status?: string; category?: string; priority?: string; search?: string }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Task[]>(`/tasks${qs}`);
  }

  async createTask(data: any): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async completeTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/complete`, {
      method: 'POST',
    });
  }

  async reopenTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/reopen`, {
      method: 'POST',
    });
  }

  async seedDemoTasks(): Promise<Task[]> {
    return this.request<Task[]>('/tasks/seed-demo', {
      method: 'POST',
    });
  }

  // --- Planner ---
  async getTodayPlan(planDate?: string): Promise<PlanData> {
    const qs = planDate ? `?plan_date=${planDate}` : '';
    return this.request<PlanData>(`/planner/today${qs}`);
  }

  async generatePlan(data: { plan_date?: string; mode?: string; buffer_minutes?: number; include_breaks?: boolean }): Promise<PlanData> {
    return this.request<PlanData>('/planner/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async replan(data: { plan_date?: string; reason?: string; current_time?: string }): Promise<any> {
    return this.request<any>('/planner/replan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBlock(id: string, data: any): Promise<any> {
    return this.request<any>(`/planner/blocks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBlock(id: string): Promise<any> {
    return this.request<any>(`/planner/blocks/${id}`, {
      method: 'DELETE',
    });
  }

  // --- AI Assistant ---
  async chat(message: string, history: ChatMessage[] = []): Promise<any> {
    return this.request<any>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }

  async parseTask(prompt: string, timezone: string = 'UTC'): Promise<any> {
    return this.request<any>('/assistant/parse-task', {
      method: 'POST',
      body: JSON.stringify({ prompt, timezone }),
    });
  }

  async breakdownGoal(data: { goal_title: string; goal_description?: string; target_days?: number; category?: string }): Promise<GoalBreakdownResponse> {
    return this.request<GoalBreakdownResponse>('/assistant/breakdown-goal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Focus Timer ---
  async startFocus(data: { task_id?: string; task_title?: string; planned_duration?: number }): Promise<FocusSession> {
    return this.request<FocusSession>('/focus/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async finishFocus(data: { session_id: string; actual_duration: number; status?: string; notes?: string; mark_task_completed?: boolean }): Promise<FocusSession> {
    return this.request<FocusSession>('/focus/finish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFocusHistory(): Promise<FocusSession[]> {
    return this.request<FocusSession[]>('/focus/history');
  }

  // --- Analytics ---
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.request<AnalyticsSummary>('/analytics/summary');
  }

  // --- Calendar ---
  async getCalendarEvents(startDate: string, endDate: string): Promise<any[]> {
    return this.request<any[]>(`/calendar?start_date=${startDate}&end_date=${endDate}`);
  }

  // --- Daily Reviews ---
  async getTodayReview(): Promise<any> {
    return this.request<any>('/reviews/today');
  }

  async generateDailyReview(dateStr?: string): Promise<any> {
    const qs = dateStr ? `?review_date=${dateStr}` : '';
    return this.request<any>(`/reviews/daily${qs}`, { method: 'POST' });
  }

  async getReviewsHistory(): Promise<any[]> {
    return this.request<any[]>('/reviews/history');
  }

  // --- Settings ---
  async getSettings(): Promise<User> {
    return this.request<User>('/settings');
  }

  async updateSettings(data: any): Promise<User> {
    return this.request<User>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async exportData(): Promise<any> {
    return this.request<any>('/settings/export-data', { method: 'POST' });
  }

  async deleteAccount(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/settings/delete-account', { method: 'DELETE' });
  }
}

export const api = new ApiService();
