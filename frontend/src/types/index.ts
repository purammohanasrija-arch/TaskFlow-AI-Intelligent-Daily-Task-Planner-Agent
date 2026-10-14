export type Role = 'student' | 'professional' | 'individual' | 'developer';
export type PlanningMode = 'balanced' | 'focus' | 'deadline';

export const PriorityLevel = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type PriorityLevel = (typeof PriorityLevel)[keyof typeof PriorityLevel];

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const RecurrenceRule = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;
export type RecurrenceRule = (typeof RecurrenceRule)[keyof typeof RecurrenceRule];
export type BlockType = 'task' | 'break' | 'commitment' | 'buffer';
export type BlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped';

export interface FixedCommitment {
  title: string;
  start_time: string;
  end_time: string;
  days: number[];
}

export interface WorkingHours {
  start_time: string;
  end_time: string;
  work_days: number[];
  fixed_commitments: FixedCommitment[];
}

export interface UserPreferences {
  role: Role;
  planning_style: string;
  planning_mode: PlanningMode;
  default_task_duration: number;
  preferred_break_duration: number;
  focus_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  theme: string;
  enable_ai_suggestions: boolean;
  ai_provider?: string;
  api_key_override?: string;
}

export interface NotificationSettings {
  in_app: boolean;
  browser_notifications: boolean;
  deadline_reminders: boolean;
  schedule_reminders: boolean;
  daily_review_reminder: boolean;
  reminder_minutes_before: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  role: Role;
  preferences: UserPreferences;
  working_hours: WorkingHours;
  notification_settings: NotificationSettings;
  onboarding_completed: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  estimated_duration: number;
  completed: boolean;
  order: number;
  completion_criteria?: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: PriorityLevel;
  status: TaskStatus;
  due_date?: string;
  estimated_duration: number;
  actual_duration: number;
  preferred_time?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  dependencies: string[];
  subtasks: SubTask[];
  recurrence: RecurrenceRule;
  goal_id?: string;
  energy_level: string;
  importance: number;
  urgency: number;
  priority_score: number;
  priority_bucket: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleBlock {
  id: string;
  user_id: string;
  task_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  block_type: BlockType;
  status: BlockStatus;
  planning_mode: PlanningMode;
  plan_date: string;
  plan_version: number;
  rationale?: string;
  is_fixed: boolean;
  category: string;
}

export interface UnscheduledTask {
  task_id: string;
  title: string;
  estimated_duration: number;
  priority: string;
  reason: string;
  recommendation: string;
}

export interface PlanData {
  plan_date: string;
  planning_mode: PlanningMode;
  total_scheduled_minutes: number;
  total_break_minutes: number;
  available_minutes: number;
  blocks: ScheduleBlock[];
  unscheduled_tasks: UnscheduledTask[];
  conflicts_detected: string[];
  ai_rationale: string;
  plan_version: number;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string;
  task_title: string;
  planned_duration: number;
  actual_duration: number;
  started_at: string;
  ended_at?: string;
  status: string;
  notes?: string;
}

export interface CategoryStat {
  category: string;
  completed_count: number;
  total_count: number;
  total_minutes: number;
}

export interface DailyCompletionTrend {
  date: string;
  completed: number;
  pending: number;
  focus_minutes: number;
}

export interface AnalyticsSummary {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  total_focus_minutes: number;
  productivity_score: number;
  score_breakdown: Record<string, any>;
  category_distribution: CategoryStat[];
  daily_trends: DailyCompletionTrend[];
  planned_vs_actual_minutes: { planned: number; actual: number };
  daily_recommendation: string;
}

export interface ProposedAction {
  action_type: string;
  description: string;
  payload: Record<string, any>;
  requires_confirmation: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  proposed_actions?: ProposedAction[];
  quick_suggestions?: string[];
}

export interface SubtaskSuggestion {
  title: string;
  estimated_duration: number;
  order: number;
  completion_criteria: string;
  recommended_day_offset: number;
  dependencies: string[];
}

export interface GoalBreakdownResponse {
  goal_title: string;
  overview: string;
  suggested_subtasks: SubtaskSuggestion[];
  total_estimated_hours: number;
}
