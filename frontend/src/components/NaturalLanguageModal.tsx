import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { PriorityLevel, RecurrenceRule, Task } from '../types';

interface NaturalLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

export const NaturalLanguageModal: React.FC<NaturalLanguageModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    'Complete DBMS notes for two hours tomorrow at 3 PM',
    'Practice five LeetCode problems this week',
    'Prepare my machine learning presentation before Friday',
    'Study probability for 90 minutes and revise formulas',
    'I have a meeting at 3 PM and need to finish my assignment today'
  ];

  const handleParse = async (textToParse?: string) => {
    const text = textToParse || prompt;
    if (!text.trim()) return;

    setIsParsing(true);
    setError(null);
    setParsedData(null);

    try {
      const result = await api.parseTask(text);
      setParsedData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to parse natural language prompt');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAndCreate = async () => {
    if (!parsedData) return;

    setIsSaving(true);
    setError(null);

    try {
      const newTask = await api.createTask({
        title: parsedData.title,
        description: parsedData.description || `Created via AI natural language parser: "${prompt}"`,
        category: parsedData.category || 'general',
        priority: parsedData.priority || PriorityLevel.MEDIUM,
        due_date: parsedData.due_date || null,
        estimated_duration: parsedData.estimated_duration || 30,
        preferred_time: parsedData.preferred_time || null,
        energy_level: parsedData.energy_level || 'medium',
        recurrence: parsedData.recurrence || RecurrenceRule.NONE,
      });

      onTaskCreated(newTask);
      onClose();
      setPrompt('');
      setParsedData(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Task with AI Natural Language" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Type your task in plain conversational English:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Complete DBMS notes for two hours tomorrow at 3 PM..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Quick Example Chips */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block mb-1.5">Quick Examples:</span>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPrompt(example);
                  handleParse(example);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:text-emerald-400 transition-colors text-left"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Parse Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={!prompt.trim() || isParsing}
            onClick={() => handleParse()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-emerald-600 text-white text-sm font-semibold shadow hover:opacity-95 disabled:opacity-50 transition-all"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Entities...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze & Extract</span>
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

        {/* Extracted Information Confirmation Card */}
        {parsedData && (
          <div className="p-4 rounded-xl bg-ivory-100/70 dark:bg-slate-800/80 border border-emerald-300 dark:border-emerald-800/60 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-slate-700">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                <span>AI Extracted Specifications (Confirm Before Saving)</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {(parsedData.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Title:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{parsedData.title}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Category:</span>
                <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">{parsedData.category}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Estimated Duration:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500 inline" />
                  <span>{parsedData.estimated_duration} minutes</span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Priority Level:</span>
                <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">{parsedData.priority}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Due Date / Deadline:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-500 inline" />
                  <span>
                    {parsedData.due_date
                      ? new Date(parsedData.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : 'None specified'}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Preferred Slot / Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{parsedData.preferred_time || 'Flexible'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setParsedData(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAndCreate}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-primaryDark transition-all"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm & Add to Schedule</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
