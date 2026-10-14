import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  Brain,
  Zap,
  BarChart2,
  RefreshCw,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const [activePreviewMode, setActivePreviewMode] = useState<'balanced' | 'focus' | 'deadline'>('balanced');

  const previewSchedules = {
    balanced: [
      { time: '09:00 AM - 10:00 AM', title: 'DBMS Normalization & Relational Algebra', type: 'task', category: 'Study', duration: '60m' },
      { time: '10:00 AM - 10:15 AM', title: 'Cognitive Recharge & Hydration', type: 'break', category: 'Rest', duration: '15m' },
      { time: '10:15 AM - 11:15 AM', title: 'Practice 3 LeetCode Medium Problems', type: 'task', category: 'Coding', duration: '60m' },
      { time: '11:15 AM - 12:00 PM', title: 'Team Project Architecture Review', type: 'commitment', category: 'Meeting', duration: '45m' },
      { time: '12:00 PM - 01:00 PM', title: 'Healthy Lunch & Physical Walk', type: 'commitment', category: 'Fixed', duration: '60m' },
    ],
    focus: [
      { time: '09:00 AM - 10:45 AM', title: 'Deep Work: Core Engine Implementation', type: 'task', category: 'Deep Work', duration: '105m' },
      { time: '10:45 AM - 11:05 AM', title: 'Restorative Break', type: 'break', category: 'Rest', duration: '20m' },
      { time: '11:05 AM - 12:30 PM', title: 'Deep Work: Machine Learning Pipeline', type: 'task', category: 'Deep Work', duration: '85m' },
      { time: '12:30 PM - 01:30 PM', title: 'Lunch & Break', type: 'commitment', category: 'Fixed', duration: '60m' },
    ],
    deadline: [
      { time: '09:00 AM - 10:15 AM', title: 'Urgent: Submit Final Lab Report (Due 1 PM)', type: 'task', category: 'Critical', duration: '75m' },
      { time: '10:15 AM - 10:25 AM', title: 'Quick Buffer', type: 'break', category: 'Buffer', duration: '10m' },
      { time: '10:25 AM - 11:45 AM', title: 'Urgent: Payment Gateway Bug Fix', type: 'task', category: 'High Urgency', duration: '80m' },
      { time: '11:45 AM - 12:30 PM', title: 'Client Milestone Sign-off Prep', type: 'task', category: 'Deadline', duration: '45m' },
    ]
  };

  return (
    <div className="min-h-screen bg-ivory-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-brand-primary/20">
      {/* Navigation Header */}
      <nav className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-brand-primary/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            TaskFlow <span className="text-brand-primary">AI</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onLogin}
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-md hover:opacity-90 transition-all"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Autonomous Daily Planning Agent</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-slate-950 dark:text-white tracking-tight leading-[1.15]">
          Plan Smarter. Focus Better. <br />
          <span className="bg-gradient-to-r from-brand-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Achieve More.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          An intelligent agent that understands your actual availability, prioritizes deadlines, generates realistic daily schedules, and autonomously adapts when your day changes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-base shadow-lg shadow-brand-primary/30 hover:bg-brand-primaryDark transition-all flex items-center justify-center space-x-2"
          >
            <span>Launch My Daily Agent</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onLogin}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-base hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Existing User Login
          </button>
        </div>
      </header>

      {/* Interactive Schedule Preview */}
      <section className="max-w-4xl mx-auto px-6 pb-20 w-full">
        <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Preview Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Agent Planning Mode:</span>
              <div className="flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-medium">
                {(['balanced', 'focus', 'deadline'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActivePreviewMode(mode)}
                    className={`px-3 py-1 rounded-md capitalize transition-all ${
                      activePreviewMode === mode
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conflict-free verified schedule</span>
            </div>
          </div>

          {/* Schedule Timeline Preview */}
          <div className="p-6 space-y-3">
            {previewSchedules[activePreviewMode].map((block, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  block.type === 'break'
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'
                    : block.type === 'commitment'
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-2 h-10 rounded-full ${
                      block.type === 'break'
                        ? 'bg-amber-400'
                        : block.type === 'commitment'
                        ? 'bg-blue-400'
                        : 'bg-brand-primary'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">{block.time}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{block.title}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {block.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{block.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities Highlights */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white">
            Built for High-Performance Productivity
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
            Deterministic scheduling rules meet adaptive AI agent intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-brand-primary flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              Natural Language Parsing
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Say "Study probability for 90 minutes tomorrow at 3 PM". The agent extracts duration, deadline, priority, and energy level with zero manual form clicking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-brand-purple flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              Autonomous Replanning
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When tasks overrun or meetings intrude, the agent shifts flexible pending tasks, protects finished milestones, and recalculates remaining hours seamlessly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              Pomodoro Focus Sync
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Linked focus sessions with audio feedback and celebratory milestones. Actual task duration is automatically measured and fed back into future planning algorithms.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800 py-8 bg-white/50 dark:bg-slate-900/50 text-center text-xs text-slate-500">
        <p>TaskFlow AI — Intelligent Daily Task Planner Agent. Production-ready, secure, and privacy-first.</p>
      </footer>
    </div>
  );
};
