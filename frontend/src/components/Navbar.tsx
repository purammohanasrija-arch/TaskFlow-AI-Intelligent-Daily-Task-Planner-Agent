import React, { useState, useEffect } from 'react';
import { Menu, Plus, Sparkles, Clock, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenSidebar: () => void;
  onOpenNLModal: () => void;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSidebar,
  onOpenNLModal,
  onSelectTab,
}) => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left section: mobile hamburger & live time */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{currentTime}</span>
          <span>•</span>
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Right section: Quick action buttons */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Add with NLP */}
        <button
          onClick={onOpenNLModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-brand-primaryDark transition-all duration-150"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Add (AI)</span>
        </button>

        {/* Start Focus Timer */}
        <button
          onClick={() => onSelectTab('focus')}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Focus Session</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={() => onSelectTab('assistant')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-brand-purple dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 text-xs sm:text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask Agent</span>
        </button>
      </div>
    </header>
  );
};
