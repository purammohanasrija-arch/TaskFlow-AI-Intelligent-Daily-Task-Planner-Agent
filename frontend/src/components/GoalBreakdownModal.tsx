import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Clock, ListOrdered, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { GoalBreakdownResponse, PriorityLevel } from '../types';

interface GoalBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksGenerated: () => void;
}

export const GoalBreakdownModal: React.FC<GoalBreakdownModalProps> = ({
  isOpen,
  onClose,
  onTasksGenerated,
}) => {
  const [goalTitle, setGoalTitle] = useState('');
  const [category, setCategory] = useState('study');
  const [targetDays, setTargetDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [breakdown, setBreakdown] = useState<GoalBreakdownResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleGoals = [
    'Prepare for a DBMS examination',
    'Build a full-stack portfolio project',
    'Prepare Machine Learning research presentation',
    'Master dynamic programming algorithms'
  ];

  const handleGenerate = async (titleToUse?: string) => {
    const title = titleToUse || goalTitle;
    if (!title.trim()) return;

    setIsGenerating(true);
    setError(null);
    setBreakdown(null);

    try {
      const res = await api.breakdownGoal({
        goal_title: title,
        target_days: targetDays,
        category: category,
      });
      setBreakdown(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate goal breakdown');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndSave = async () => {
    if (!breakdown) return;

    setIsSaving(true);
    setError(null);

    try {
      // Create master parent task with subtasks
      const subtaskItems = breakdown.suggested_subtasks.map((st) => ({
        title: st.title,
        estimated_duration: st.estimated_duration,
        completion_criteria: st.completion_criteria,
      }));

      await api.createTask({
        title: breakdown.goal_title,
        description: breakdown.overview,
        category: category,
        priority: PriorityLevel.HIGH,
        estimated_duration: Math.round(breakdown.total_estimated_hours * 60),
        subtasks: subtaskItems,
        energy_level: 'high',
        importance: 5,
        urgency: 4,
      });

      onTasksGenerated();
      onClose();
      setGoalTitle('');
      setBreakdown(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save generated tasks');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart Goal Breakdown Agent" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Large Goal or Objective to Decompose:
          </label>
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="e.g. Prepare for a DBMS examination..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
        </div>

        {/* Quick Sample Goals */}
        <div className="flex flex-wrap gap-1.5">
          {sampleGoals.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setGoalTitle(sample);
                handleGenerate(sample);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-purple/10 hover:text-brand-purple dark:hover:text-purple-300 transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="study">Study / Academic</option>
              <option value="coding">Coding / Tech Project</option>
              <option value="work">Work / Professional</option>
              <option value="health">Health & Fitness</option>
              <option value="personal">Personal Goal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Horizon (Days):
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={!goalTitle.trim() || isGenerating}
            onClick={() => handleGenerate()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-indigo-600 text-white text-sm font-semibold shadow hover:opacity-95 disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deconstructing Roadmap...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Break Down Goal</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Breakdown Results */}
        {breakdown && (
          <div className="p-4 rounded-xl bg-ivory-100/70 dark:bg-slate-800/80 border border-purple-200 dark:border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Roadmap: {breakdown.suggested_subtasks.length} Actionable Subtasks ({breakdown.total_estimated_hours} hrs total)
              </span>
              <span className="text-[11px] font-semibold text-brand-purple dark:text-purple-300">
                {targetDays} Day Target
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
              "{breakdown.overview}"
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {breakdown.suggested_subtasks.map((sub, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-start space-x-3 text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-brand-purple dark:text-purple-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    {sub.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{sub.title}</span>
                      <span className="text-slate-400 flex items-center space-x-1 flex-shrink-0 ml-2">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{sub.estimated_duration}m</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-medium">Done when:</strong> {sub.completion_criteria}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setBreakdown(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleApproveAndSave}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-bold hover:opacity-90 transition-all"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Approve & Add to Task Queue</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
