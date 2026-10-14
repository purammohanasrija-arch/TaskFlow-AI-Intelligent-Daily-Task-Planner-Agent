import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Loader2,
  FolderPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChatMessage, ProposedAction } from '../types';
import { GoalBreakdownModal } from '../components/GoalBreakdownModal';

interface AssistantPageProps {
  onSelectTab: (tab: string) => void;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({ onSelectTab }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello ${user?.name.split(' ')[0] || 'there'}! I am your TaskFlow AI daily planning coach. I have full authorized visibility into your tasks, deadlines, and schedule. How can I assist you right now?`,
      timestamp: new Date().toISOString(),
      quick_suggestions: [
        'What should I do next?',
        'Plan my day',
        'I have only 2 hours left. What can I finish?',
        'Reschedule unfinished tasks',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.chat(text.trim(), historyPayload);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        proposed_actions: res.proposed_actions || [],
        quick_suggestions: res.quick_suggestions || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error connecting to the AI planning agent. Please try again or rephrase your request.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: ProposedAction) => {
    if (action.action_type === 'replan_day') {
      onSelectTab('planner');
    } else if (action.action_type === 'start_focus') {
      onSelectTab('focus');
    } else if (action.action_type === 'breakdown_task') {
      setIsBreakdownModalOpen(true);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Assistant Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-purple to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-purple/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              TaskFlow AI Copilot
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Grounded in your active tasks & availability</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsBreakdownModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-brand-purple dark:text-purple-300 border border-purple-200/60 dark:border-purple-800 text-xs font-semibold hover:bg-purple-100 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Goal Breakdown Tool</span>
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={idx} className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-brand-primary text-white'
                    : 'bg-purple-100 dark:bg-purple-950/60 text-brand-purple dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-xl space-y-2.5 ${isUser ? 'items-end' : ''}`}>
                {/* Text Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-brand-primary text-white rounded-tr-none shadow-sm'
                      : 'bg-ivory-100/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/70 dark:border-slate-700/70 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Proposed Action Cards */}
                {msg.proposed_actions && msg.proposed_actions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.proposed_actions.map((act, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 text-xs flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                            <span>Proposed AI Action:</span>
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 block">{act.description}</span>
                        </div>
                        <button
                          onClick={() => executeAction(act)}
                          className="px-3.5 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-bold hover:opacity-90 shadow-sm transition-all ml-3 flex-shrink-0"
                        >
                          Execute Now →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick prompt suggestions attached to message */}
                {msg.quick_suggestions && msg.quick_suggestions.length > 0 && idx === messages.length - 1 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.quick_suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSend(sug)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-purple/10 hover:text-brand-purple dark:hover:text-purple-300 transition-colors text-left font-medium"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-brand-purple flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-ivory-100/70 dark:bg-slate-800 text-xs text-slate-500 flex items-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing schedule and synthesizing recommendation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything: 'What should I do next?', 'I have 2 hours left', 'Plan my day'..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-brand-purple text-white shadow hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <GoalBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        onTasksGenerated={() => onSelectTab('tasks')}
      />
    </div>
  );
};
