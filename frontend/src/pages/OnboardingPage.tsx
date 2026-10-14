import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Briefcase,
  GraduationCap,
  Code,
  Heart,
  Coffee,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Role, PlanningMode } from '../types';

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>(user?.preferences?.role || 'student');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri
  const [planningMode, setPlanningMode] = useState<PlanningMode>('balanced');
  const [breakDuration, setBreakDuration] = useState(15);
  const [seedDemo, setSeedDemo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (dayIndex: number) => {
    if (workDays.includes(dayIndex)) {
      setWorkDays(workDays.filter((d) => d !== dayIndex));
    } else {
      setWorkDays([...workDays, dayIndex].sort());
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await updateUser({
        role: role,
        onboarding_completed: true,
        preferences: {
          role: role,
          planning_style: 'structured',
          planning_mode: planningMode,
          default_task_duration: 45,
          preferred_break_duration: breakDuration,
          focus_duration: 25,
          short_break_duration: 5,
          long_break_duration: 15,
          theme: 'light',
          enable_ai_suggestions: true,
        },
        working_hours: {
          start_time: startTime,
          end_time: endTime,
          work_days: workDays,
          fixed_commitments: [
            {
              title: 'Lunch & Break',
              start_time: '12:30',
              end_time: '13:30',
              days: workDays,
            },
          ],
        },
      });

      if (seedDemo) {
        await api.seedDemoTasks();
      }

      onComplete();
    } catch (e) {
      console.error('Failed to complete onboarding', e);
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 dark:bg-slate-950 flex flex-col justify-center items-center py-12 px-4 selection:bg-brand-primary/20">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold text-sm">
              {step}
            </div>
            <span className="font-heading font-bold text-slate-800 dark:text-slate-100">
              {step === 1 && 'Step 1: Your Role & Objectives'}
              {step === 2 && 'Step 2: Daily Working Hours'}
              {step === 3 && 'Step 3: Planning Mode & Defaults'}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400">Step {step} of 3</span>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              TaskFlow AI customizes scheduling templates and prioritization weights based on how you work:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'student',
                  label: 'Student',
                  desc: 'Manage lectures, assignments, exam preparation & revisions',
                  icon: GraduationCap,
                  color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
                },
                {
                  id: 'developer',
                  label: 'Developer',
                  desc: 'Coding blocks, LeetCode, system design & bug squashing',
                  icon: Code,
                  color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                },
                {
                  id: 'professional',
                  label: 'Professional',
                  desc: 'Meetings, project deliverables, emails & deadlines',
                  icon: Briefcase,
                  color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
                },
                {
                  id: 'individual',
                  label: 'Individual',
                  desc: 'Personal goals, health routines, errands & habits',
                  icon: Heart,
                  color: 'text-coral-500 bg-orange-50 dark:bg-orange-950/40',
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as Role)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 ring-2 ring-brand-primary/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">
                      {item.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow hover:bg-brand-primaryDark transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Working Hours */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define your typical daily availability window. The scheduling agent will never schedule work outside these bounds:
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Start Work / Study At:</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Finish By:</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Active Days of the Week:
              </label>
              <div className="flex gap-2">
                {daysLabels.map((day, idx) => {
                  const active = workDays.includes(idx);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow hover:bg-brand-primaryDark transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Planning Mode & Demo Seed */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Preferred Planning Strategy:
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'balanced',
                    title: 'Balanced Mode (Recommended)',
                    desc: 'Balanced study/work pacing with built-in rest buffers and quick wins.',
                  },
                  {
                    id: 'focus',
                    title: 'Focus Mode (Deep Work)',
                    desc: 'Longer uninterrupted blocks (up to 90 min) reserved for high-energy tasks.',
                  },
                  {
                    id: 'deadline',
                    title: 'Deadline Mode (Urgent Delivery)',
                    desc: 'Strict chronological ordering of approaching deadlines and deliverables.',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPlanningMode(m.id as PlanningMode)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      planningMode === m.id
                        ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 ring-2 ring-brand-primary/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                      {m.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-3">
              <input
                type="checkbox"
                id="seedDemo"
                checked={seedDemo}
                onChange={(e) => setSeedDemo(e.target.checked)}
                className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
              />
              <label htmlFor="seedDemo" className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                <strong>Pre-load realistic demo tasks</strong> tailored to your selected role so you can immediately test schedule generation, the focus timer, and AI replanning!
              </label>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="flex items-center space-x-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-emerald-600 text-white text-sm font-bold shadow hover:opacity-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Your Workspace...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch TaskFlow AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
