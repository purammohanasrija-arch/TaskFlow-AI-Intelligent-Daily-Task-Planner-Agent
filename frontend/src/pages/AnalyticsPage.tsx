import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  Clock,
  PieChart as PieIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsSummary } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.getAnalyticsSummary();
        setData(res);
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const COLORS = ['#10B981', '#8B5CF6', '#F97316', '#3B82F6', '#EC4899', '#64748B'];

  const categoryChartData = data?.category_distribution?.map((c) => ({
    name: c.category.toUpperCase(),
    value: c.completed_count || c.total_count,
    minutes: c.total_minutes,
  })) || [];

  const plannedVsActualData = [
    {
      name: 'Planned vs Actual (Mins)',
      Planned: data?.planned_vs_actual_minutes?.planned || 0,
      Actual: data?.planned_vs_actual_minutes?.actual || 0,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
          Analytics & Performance Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Track completion velocity, category investment, and scheduling accuracy over time.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Completion Rate</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-brand-primary font-heading">
            {data?.completion_rate || 0}%
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {data?.completed_tasks || 0} completed of {data?.total_tasks || 0} total
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Total Focus Time</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-heading">
            {data?.total_focus_minutes || 0}m
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Logged across Pomodoro blocks
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Overdue Rate</span>
          <span className={`text-2xl sm:text-3xl font-extrabold font-heading ${data?.overdue_tasks ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
            {data?.overdue_tasks || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {data?.overdue_tasks ? 'Requires schedule shifting' : 'Zero missed deadlines'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Productivity Index</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-brand-purple font-heading">
            {data?.productivity_score || 0}/100
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Comprehensive algorithmic rating
          </span>
        </div>
      </div>

      {/* Transparent Productivity Score Breakdown Box */}
      {data?.score_breakdown && (
        <div className="p-5 rounded-2xl bg-ivory-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-100">
            <Info className="w-4 h-4 text-brand-purple" />
            <span>Transparent Productivity Score Formula:</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            {data.score_breakdown.formula}
          </p>
          <div className="flex items-center space-x-4 pt-1 text-slate-500 flex-wrap gap-y-1">
            <span>Completion: +{data.score_breakdown.completion_points} pts</span>
            <span>Focus Time: +{data.score_breakdown.focus_points} pts</span>
            <span>Planning Bonus: +{data.score_breakdown.planning_points} pts</span>
            <span className="text-rose-500">Overdue Penalty: -{data.score_breakdown.overdue_penalty} pts</span>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-brand-purple" />
              <span>Category Distribution</span>
            </h3>
            <span className="text-xs text-slate-400">By completed tasks</span>
          </div>

          <div className="h-64 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Planned vs Actual Duration */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Planned vs Actual Duration</span>
            </h3>
            <span className="text-xs text-slate-400">Minutes comparison</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plannedVsActualData} barSize={36}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Planned" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Planned Minutes" />
                <Bar dataKey="Actual" fill="#10B981" radius={[6, 6, 0, 0]} name="Actual Minutes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
