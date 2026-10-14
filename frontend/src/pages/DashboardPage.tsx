import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Play,
  TrendingUp,
  Brain,
  ListTodo,
  RefreshCw,
  Plus
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, PlanData, AnalyticsSummary } from '../types';

interface DashboardPageProps {
  onSelectTab: (tab: string) => void;
  onOpenNLModal: () => void;
  onOpenTaskModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectTab,
  onOpenNLModal,
  onOpenTaskModal,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedTasks, fetchedPlan, fetchedAnalytics] = await Promise.all([
        api.getTasks(),
        api.getTodayPlan().catch(() => null),
        api.getAnalyticsSummary().catch(() => null),
      ]);
      setTasks(fetchedTasks);
      setPlan(fetchedPlan);
      setAnalytics(fetchedAnalytics);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = pendingTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date()
  );

  // Next or current task (highest priority score)
  const nextTask = pendingTasks.sort((a, b) => b.priority_score - a.priority_score)[0];

  const completionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Greeting & AI Recommendation Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-ivory-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Daily Mission Control
            </span>
            <span>•</span>
            <span className="text-xs text-slate-500 capitalize">
              Role: {user?.role || user?.preferences?.role || 'Learner'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : (new Date().getHours() < 17 ? 'afternoon' : 'evening')}, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {analytics?.daily_recommendation ||
              "Ready to conquer today. Your AI agent has analyzed your goals and will help keep you on track."}
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <button
            onClick={() => onSelectTab('planner')}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-primary/20 hover:bg-brand-primaryDark transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Plan My Day</span>
          </button>
          <button
            onClick={onOpenNLModal}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Task</span>
          </button>
        </div>
      </div>

      {/* Metrics Row: 4 Essential Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Ring / Completion Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Today's Completion
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
                {completionRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium">({completedTasks.length}/{tasks.length})</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
              {pendingTasks.length} pending tasks
            </span>
          </div>

          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-100 dark:text-slate-800"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={138.2}
                strokeDashoffset={138.2 - (138.2 * completionRate) / 100}
                strokeLinecap="round"
                className="text-brand-primary transition-all duration-500"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-700 dark:text-slate-300">
              {completionRate}%
            </span>
          </div>
        </div>

        {/* Productivity Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Productivity Score
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
              {analytics?.productivity_score || 78}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Formula: 40% Completion + 25% Focus + 10% Plan
          </span>
        </div>

        {/* Focus Time Logged */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Focus Minutes
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
              {analytics?.total_focus_minutes || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">mins</span>
          </div>
          <button
            onClick={() => onSelectTab('focus')}
            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline mt-1 block"
          >
            Start Pomodoro Session →
          </button>
        </div>

        {/* Overdue / Deadlines */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Overdue Tasks
            </span>
            <AlertTriangle className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl sm:text-3xl font-extrabold font-heading ${overdueTasks.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {overdueTasks.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">due</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {overdueTasks.length > 0 ? 'Priority replan advised' : 'All deadlines on track'}
          </span>
        </div>
      </div>

      {/* Main Grid: Next Best Action & Today's Schedule preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Task Highlight Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border border-purple-200/80 dark:border-purple-900/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-purple dark:text-purple-300 flex items-center space-x-1.5">
                <Brain className="w-4 h-4" />
                <span>Next Best Action (AI Priority)</span>
              </span>
              {nextTask && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple dark:text-purple-300">
                  Score: {nextTask.priority_score}/100
                </span>
              )}
            </div>

            {nextTask ? (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {nextTask.title}
                </h3>
                {nextTask.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {nextTask.description}
                  </p>
                )}
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{nextTask.estimated_duration} mins</span>
                  </span>
                  <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                    {nextTask.category}
                  </span>
                  <span className="capitalize text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                    {nextTask.priority}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onSelectTab('focus')}
                    className="w-full py-2.5 rounded-xl bg-brand-purple text-white text-xs font-bold shadow hover:opacity-90 transition-all flex items-center justify-center space-x-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start 25m Focus Block</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No pending tasks! All caught up.
                </p>
                <button
                  onClick={onOpenTaskModal}
                  className="text-xs font-bold text-brand-primary hover:underline"
                >
                  + Add a new task
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions List */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Shortcuts
            </span>
            <button
              onClick={() => onSelectTab('planner')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-brand-primary" />
                <span>AI Daily Planning Workspace</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onSelectTab('assistant')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-brand-purple" />
                <span>Ask AI Productivity Coach</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onSelectTab('calendar')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>View Full Calendar Schedule</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Schedule Preview & Weekly Trend Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Blocks */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                  Today's Time-Block Schedule
                </h3>
                <span className="text-xs text-slate-400">
                  {plan?.blocks ? `${plan.blocks.length} blocks allocated` : 'No plan generated yet today'}
                </span>
              </div>
              <button
                onClick={() => onSelectTab('planner')}
                className="text-xs font-bold text-brand-primary hover:underline flex items-center space-x-1"
              >
                <span>Open Full Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {plan?.blocks && plan.blocks.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {plan.blocks.slice(0, 5).map((block) => (
                  <div
                    key={block.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      block.block_type === 'break'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                        : block.block_type === 'commitment'
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-7 rounded-full ${
                          block.block_type === 'break'
                            ? 'bg-amber-400'
                            : block.block_type === 'commitment'
                            ? 'bg-blue-400'
                            : 'bg-brand-primary'
                        }`}
                      />
                      <div>
                        <span className="font-bold text-slate-400 text-[11px] block">
                          {new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {block.title}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {block.block_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3 bg-ivory-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Sparkles className="w-8 h-8 text-brand-primary mx-auto opacity-70" />
                <p className="text-xs text-slate-500">
                  Your day hasn't been scheduled yet. Let the AI agent generate an optimal timeline!
                </p>
                <button
                  onClick={() => onSelectTab('planner')}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold shadow hover:bg-brand-primaryDark transition-all"
                >
                  Generate Today's Plan
                </button>
              </div>
            )}
          </div>

          {/* 7-Day Completion Trend Chart */}
          {analytics?.daily_trends && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                    7-Day Completion Activity
                  </h3>
                  <span className="text-xs text-slate-400">Completed tasks vs pending tasks</span>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.daily_trends} barSize={18}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="pending" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
