import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export const CalendarPage: React.FC = () => {
  const [view, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute start and end date for fetching
  const getRange = (date: Date, mode: 'day' | 'week' | 'month') => {
    const d = new Date(date);
    if (mode === 'day') {
      const s = d.toISOString().slice(0, 10);
      return { start: s, end: s };
    } else if (mode === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const start = new Date(d.setDate(diff));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    } else {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { start, end } = getRange(currentDate, view);
      const data = await api.getCalendarEvents(start, end);
      setEvents(data);
    } catch (e) {
      console.error('Failed to load calendar events', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate, view]);

  const navigateDate = (delta: number) => {
    const d = new Date(currentDate);
    if (view === 'day') {
      d.setDate(d.getDate() + delta);
    } else if (view === 'week') {
      d.setDate(d.getDate() + delta * 7);
    } else {
      d.setMonth(d.getMonth() + delta);
    }
    setCurrentDate(d);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            Schedule & Deadlines Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Unified view of time blocks, milestones, and commitments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  view === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-500'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            >
              Today
            </button>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week View Grid */}
      {view === 'week' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="grid grid-cols-7 gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-center">
            {weekDays.map((day, i) => (
              <div key={day} className="text-xs font-bold text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 min-h-[350px]">
            {weekDays.map((_, i) => {
              // Calculate day date
              const d = new Date(currentDate);
              const day = d.getDay();
              const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i;
              const colDate = new Date(d.setDate(diff)).toISOString().slice(0, 10);
              const dayEvents = events.filter((ev) => ev.start && ev.start.slice(0, 10) === colDate);

              return (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col space-y-1.5 min-h-[200px]"
                >
                  <span className="text-[11px] font-bold text-slate-500 block text-right pb-1 border-b border-slate-200/40">
                    {colDate.slice(8, 10)}
                  </span>

                  <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className={`p-2 rounded-lg text-[11px] font-semibold border leading-tight ${
                          ev.type === 'deadline'
                            ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : ev.block_type === 'break'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        <span className="block truncate font-bold">{ev.title}</span>
                        {ev.start && ev.type !== 'deadline' && (
                          <span className="text-[10px] opacity-75 block mt-0.5">
                            {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day / Month Views */}
      {view !== 'week' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-100">
            Events for {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric', day: view === 'day' ? 'numeric' : undefined })}
          </h3>
          <div className="space-y-2">
            {events.length > 0 ? (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                      {ev.title}
                    </span>
                    <span className="text-slate-500">
                      {ev.start ? new Date(ev.start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'All day'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {ev.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No events found in this date window.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
