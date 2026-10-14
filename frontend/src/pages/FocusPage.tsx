import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Coffee,
  Volume2,
  VolumeX,
  Sparkles,
  ListTodo
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Task, FocusSession } from '../types';

export const FocusPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [focusDuration, setFocusDuration] = useState<number>(25); // minutes
  const [breakDuration, setBreakDuration] = useState<number>(5);  // minutes
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [history, setHistory] = useState<FocusSession[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load tasks & history
  const loadData = async () => {
    try {
      const [fetchedTasks, fetchedHistory] = await Promise.all([
        api.getTasks({ status: 'pending' }),
        api.getFocusHistory(),
      ]);
      setTasks(fetchedTasks);
      setHistory(fetchedHistory);
      if (fetchedTasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(fetchedTasks[0].id);
      }
    } catch (e) {
      console.error('Failed to load focus page data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Timer tick
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleStart = async () => {
    if (!isRunning && !sessionId && mode === 'focus') {
      try {
        const selectedTask = tasks.find((t) => t.id === selectedTaskId);
        const res = await api.startFocus({
          task_id: selectedTaskId || undefined,
          task_title: selectedTask?.title || 'Focus Session',
          planned_duration: focusDuration,
        });
        setSessionId(res.id);
      } catch (e) {
        console.error('Failed to start focus session in backend', e);
      }
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? focusDuration * 60 : breakDuration * 60);
    setSessionId(null);
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(
        mode === 'focus' ? '🎉 Focus Session Finished!' : '☕ Break Ended!',
        {
          body:
            mode === 'focus'
              ? 'Great execution! Take a short restorative break.'
              : 'Break is complete. Ready to resume deep focus?',
        }
      );
    }

    if (sessionId && mode === 'focus') {
      try {
        const markComplete = window.confirm(
          'Great job! Would you like to mark this task as COMPLETED in your task list as well?'
        );
        await api.finishFocus({
          session_id: sessionId,
          actual_duration: focusDuration,
          mark_task_completed: markComplete,
        });
        await loadData();
      } catch (e) {
        console.error('Failed to finish focus session in backend', e);
      }
    }

    // Switch mode
    if (mode === 'focus') {
      setMode('break');
      setTimeLeft(breakDuration * 60);
    } else {
      setMode('focus');
      setTimeLeft(focusDuration * 60);
    }
    setSessionId(null);
  };

  const setPreset = (fMin: number, bMin: number) => {
    setIsRunning(false);
    setFocusDuration(fMin);
    setBreakDuration(bMin);
    setTimeLeft(mode === 'focus' ? fMin * 60 : bMin * 60);
    setSessionId(null);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = mode === 'focus' ? focusDuration * 60 : breakDuration * 60;
  const progressPercent = Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
          Pomodoro & Deep Work Timer
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Sync focused blocks directly with your tasks to accurately record actual effort.
        </p>
      </div>

      {/* Main Timer Display Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-6">
        {/* Presets */}
        <div className="flex items-center justify-center space-x-2">
          {[
            { label: '25m Focus / 5m Break', f: 25, b: 5 },
            { label: '50m Deep Work / 10m Break', f: 50, b: 10 },
            { label: '15m Quick Sprint', f: 15, b: 3 },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setPreset(preset.f, preset.b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                focusDuration === preset.f && breakDuration === preset.b
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Task Selector */}
        <div className="max-w-md mx-auto">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Active Task Being Worked On:
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={isRunning}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {tasks.length > 0 ? (
              tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.category} - {t.estimated_duration}m)
                </option>
              ))
            ) : (
              <option value="">No pending tasks (Free Focus Session)</option>
            )}
          </select>
        </div>

        {/* Circular Progress & Time */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          <svg className="w-64 h-64 transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-100 dark:text-slate-800"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={691.15}
              strokeDashoffset={691.15 - (691.15 * progressPercent) / 100}
              strokeLinecap="round"
              className={`transition-all duration-300 ${
                mode === 'focus' ? 'text-brand-primary' : 'text-amber-500'
              }`}
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2 ${
                mode === 'focus'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}
            >
              {mode === 'focus' ? 'Deep Focus' : 'Break Time'}
            </span>
            <span className="text-5xl sm:text-6xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tighter">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-400 font-semibold mt-1">
              {progressPercent}% elapsed
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center space-x-2 px-8 py-4 rounded-2xl bg-brand-primary text-white font-extrabold text-base shadow-lg shadow-brand-primary/25 hover:bg-brand-primaryDark transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Start Session</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center space-x-2 px-8 py-4 rounded-2xl bg-amber-500 text-white font-extrabold text-base shadow-lg shadow-amber-500/25 hover:bg-amber-600 transition-all"
            >
              <Pause className="w-5 h-5 fill-white" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Focus History */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <span>Recent Completed Focus Sessions</span>
          </h3>
          <span className="text-xs text-slate-400">{history.length} logged</span>
        </div>

        {history.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {history.slice(0, 8).map((session) => (
              <div
                key={session.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    {session.task_title || 'Focus Session'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(session.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
                  +{session.actual_duration || session.planned_duration} mins
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No completed sessions logged yet.</p>
        )}
      </div>
    </div>
  );
};
