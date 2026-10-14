import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Coffee,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { PlanData, PlanningMode, ScheduleBlock } from '../types';

export const PlannerPage: React.FC = () => {
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [planningMode, setPlanningMode] = useState<PlanningMode>('balanced');
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [replanResult, setReplanResult] = useState<any>(null);

  const loadPlan = async (dateToLoad?: string) => {
    setLoading(true);
    try {
      const d = dateToLoad || planDate;
      const data = await api.getTodayPlan(d);
      setPlan(data);
      if (data.planning_mode) {
        setPlanningMode(data.planning_mode);
      }
    } catch (e) {
      console.error('Failed to load plan', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan(planDate);
  }, [planDate]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const data = await api.generatePlan({
        plan_date: planDate,
        mode: planningMode,
        include_breaks: true,
        buffer_minutes: 10,
      });
      setPlan(data);
    } catch (e) {
      console.error('Failed to generate plan', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReplan = async () => {
    setIsReplanning(true);
    setReplanResult(null);
    try {
      const result = await api.replan({
        plan_date: planDate,
        reason: 'Adjusting schedule due to task progress and remaining hours',
        current_time: new Date().toISOString(),
      });
      setReplanResult(result);
      await loadPlan(planDate);
    } catch (e) {
      console.error('Failed to replan day', e);
    } finally {
      setIsReplanning(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await api.deleteBlock(blockId);
      if (plan) {
        setPlan({
          ...plan,
          blocks: plan.blocks.filter((b) => b.id !== blockId),
        });
      }
    } catch (e) {
      console.error('Failed to delete block', e);
    }
  };

  const shiftDay = (days: number) => {
    const current = new Date(planDate);
    current.setDate(current.getDate() + days);
    setPlanDate(current.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner and Mode Switcher */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-purple">
                Autonomous Daily Planning Agent
              </span>
              <span>•</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Deterministic Conflict Checking</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
              Daily Planning Workspace
            </h1>
          </div>

          {/* Date Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => shiftDay(-1)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <button
              onClick={() => shiftDay(1)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPlanDate(new Date().toISOString().slice(0, 10))}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary"
            >
              Today
            </button>
          </div>
        </div>

        {/* Planning Modes & Execution Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Mode:</span>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              {(
                [
                  { id: 'balanced', label: 'Balanced Mode' },
                  { id: 'focus', label: 'Focus Mode' },
                  { id: 'deadline', label: 'Deadline Mode' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPlanningMode(m.id as PlanningMode)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    planningMode === m.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReplan}
              disabled={isReplanning}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-brand-purple dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReplanning ? 'animate-spin' : ''}`} />
              <span>Replan My Day</span>
            </button>

            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-emerald-600 text-white text-xs font-bold shadow-md shadow-brand-primary/20 hover:opacity-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate My Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Replan Notification / Confirmation Card */}
      {replanResult && (
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-brand-purple" />
              <span>Autonomous Replanning Executed Successfully</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900">
              Preserved {replanResult.preserved_blocks_count} completed / shifted {replanResult.shifted_tasks_count}
            </span>
          </div>
          <p className="italic">{replanResult.ai_explanation}</p>
          <div className="pt-1">
            <span className="font-semibold block mb-1">Adjustments made:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-purple-800 dark:text-purple-300">
              {replanResult.changes_summary.map((change: string, idx: number) => (
                <li key={idx}>{change}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* "Why This Plan?" AI Rationale Box */}
      {plan?.ai_rationale && (
        <div className="p-4 rounded-2xl bg-ivory-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start space-x-3 text-xs">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-brand-primary flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-100 block">
              Why this schedule was generated:
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {plan.ai_rationale}
            </p>
          </div>
        </div>
      )}

      {/* Unscheduled Tasks Alert (Section 3.B - If overloaded, clearly explain) */}
      {plan?.unscheduled_tasks && plan.unscheduled_tasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {plan.unscheduled_tasks.length} task(s) could not fit in today's available hours:
            </span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Instead of creating an unrealistic, exhausting plan, the agent has flagged these items:
          </p>
          <div className="space-y-1.5 pt-1">
            {plan.unscheduled_tasks.map((un, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{un.title}</span>
                  <span className="text-[11px] text-slate-500">{un.reason}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  {un.recommendation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Schedule Blocks */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              Daily Timeline ({plan?.blocks?.length || 0} Blocks)
            </h3>
            <span className="text-xs text-slate-400">
              Total Focused Time: {plan?.total_scheduled_minutes || 0}m | Total Breaks: {plan?.total_break_minutes || 0}m
            </span>
          </div>
        </div>

        {plan?.blocks && plan.blocks.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 my-2">
            {plan.blocks.map((block) => {
              const isTask = block.block_type === 'task';
              const isBreak = block.block_type === 'break';
              const isCommitment = block.block_type === 'commitment';

              const startTimeFormatted = new Date(block.start_time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endTimeFormatted = new Date(block.end_time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={block.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      isBreak
                        ? 'bg-amber-400 ring-4 ring-amber-100 dark:ring-amber-950'
                        : isCommitment
                        ? 'bg-blue-400 ring-4 ring-blue-100 dark:ring-blue-950'
                        : 'bg-brand-primary ring-4 ring-emerald-100 dark:ring-emerald-950'
                    }`}
                  />

                  {/* Block Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isBreak
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                        : isCommitment
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-500">
                            {startTimeFormatted} - {endTimeFormatted}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isBreak
                                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                                : isCommitment
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {block.block_type}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {block.title}
                        </h4>

                        {block.rationale && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Agent Rationale: {block.rationale}
                          </p>
                        )}
                      </div>

                      {/* Manual Action: Delete Block */}
                      {!block.is_fixed && (
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-heading font-bold text-base text-slate-800 dark:text-slate-200">
              No schedule blocks for {planDate}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click "Generate My Plan" above to create a personalized schedule.
            </p>
            <button
              onClick={handleGeneratePlan}
              className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold shadow"
            >
              Generate My Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
