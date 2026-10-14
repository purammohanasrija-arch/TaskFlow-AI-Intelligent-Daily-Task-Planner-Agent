import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Clock,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Role, PlanningMode } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState<Role>(user?.preferences?.role || 'student');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [startTime, setStartTime] = useState(user?.working_hours?.start_time || '09:00');
  const [endTime, setEndTime] = useState(user?.working_hours?.end_time || '18:00');
  const [breakDuration, setBreakDuration] = useState(user?.preferences?.preferred_break_duration || 15);
  const [planningMode, setPlanningMode] = useState<PlanningMode>(user?.preferences?.planning_mode || 'balanced');
  const [apiKeyOverride, setApiKeyOverride] = useState(user?.preferences?.api_key_override || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.preferences?.role || user.role || 'student');
      setTimezone(user.timezone || 'UTC');
      setStartTime(user.working_hours?.start_time || '09:00');
      setEndTime(user.working_hours?.end_time || '18:00');
      setBreakDuration(user.preferences?.preferred_break_duration || 15);
      setPlanningMode(user.preferences?.planning_mode || 'balanced');
      setApiKeyOverride(user.preferences?.api_key_override || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateUser({
        name,
        timezone,
        role,
        preferences: {
          ...user?.preferences,
          role,
          planning_mode: planningMode,
          preferred_break_duration: Number(breakDuration),
          api_key_override: apiKeyOverride.trim() || undefined,
        },
        working_hours: {
          ...user?.working_hours,
          start_time: startTime,
          end_time: endTime,
        },
      });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskflow_ai_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'WARNING: Are you sure you want to permanently delete your account and all associated tasks? This action CANNOT be undone.'
    );
    if (!confirmed) return;

    try {
      await api.deleteAccount();
      logout();
    } catch (e) {
      alert('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
          Settings & Agent Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage your schedule constraints, custom AI API keys, working hours, and data privacy.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <User className="w-4 h-4 text-brand-primary" />
            <span>User Profile & Role</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="student">Student</option>
                <option value="developer">Developer</option>
                <option value="professional">Professional</option>
                <option value="individual">Individual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule & Working Hours */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Working Hours & Planning Constraints</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Workday Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Workday End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Break (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* AI Provider Configuration */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Key className="w-4 h-4 text-brand-purple" />
              <span>AI Provider Configuration</span>
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              Heuristic Engine Active by Default
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            TaskFlow AI features built-in deterministic heuristic engines for natural language parsing, schedule synthesis, and goal decomposition. You can optionally supply your own Google Gemini or Groq API key here:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Google Gemini or Groq API Key (Optional Override)
            </label>
            <input
              type="password"
              value={apiKeyOverride}
              onChange={(e) => setApiKeyOverride(e.target.value)}
              placeholder="AIzaSy... or gsk_..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs sm:text-sm font-bold shadow hover:bg-brand-primaryDark transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Privacy, Data Export, and Account Deletion */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <span>Privacy & Data Sovereignty</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
              Export All Personal Data
            </span>
            <span className="text-[11px] text-slate-400">
              Download complete JSON archive of all tasks, schedule blocks, focus logs, and daily reviews.
            </span>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 text-slate-700 dark:text-slate-200 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Data (JSON)'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="font-bold text-xs text-rose-600 block">
              Danger Zone: Delete Account
            </span>
            <span className="text-[11px] text-slate-400">
              Permanently purge your account, tasks, and history from the database.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold hover:bg-rose-100 flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
