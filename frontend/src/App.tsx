import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { PlannerPage } from './pages/PlannerPage';
import { CalendarPage } from './pages/CalendarPage';
import { AssistantPage } from './pages/AssistantPage';
import { FocusPage } from './pages/FocusPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { NaturalLanguageModal } from './components/NaturalLanguageModal';
import { TaskFormModal } from './components/TaskFormModal';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Global Quick modals
  const [isNLModalOpen, setIsNLModalOpen] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary animate-pulse" />
          <span className="text-xs font-semibold text-slate-500 font-heading">
            Initializing TaskFlow AI...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (authView === 'landing') {
      return (
        <LandingPage
          onGetStarted={() => setAuthView('register')}
          onLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <AuthPage
        defaultMode={authView === 'register' ? 'register' : 'login'}
        onSuccess={() => setAuthView('landing')}
        onBackToHome={() => setAuthView('landing')}
      />
    );
  }

  // Onboarding wizard if not completed
  if (!user.onboarding_completed) {
    return <OnboardingPage onComplete={() => setCurrentTab('dashboard')} />;
  }

  // Authenticated Main Application Workspace
  return (
    <div className="min-h-screen bg-ivory-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenNLModal={() => setIsNLModalOpen(true)}
          onSelectTab={setCurrentTab}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onSelectTab={setCurrentTab}
              onOpenNLModal={() => setIsNLModalOpen(true)}
              onOpenTaskModal={() => setIsTaskModalOpen(true)}
            />
          )}

          {currentTab === 'tasks' && <TasksPage />}

          {currentTab === 'planner' && <PlannerPage />}

          {currentTab === 'calendar' && <CalendarPage />}

          {currentTab === 'assistant' && (
            <AssistantPage onSelectTab={setCurrentTab} />
          )}

          {currentTab === 'focus' && <FocusPage />}

          {currentTab === 'analytics' && <AnalyticsPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Global Modals */}
      <NaturalLanguageModal
        isOpen={isNLModalOpen}
        onClose={() => setIsNLModalOpen(false)}
        onTaskCreated={() => {
          // If on tasks tab or dashboard, trigger reload if needed
        }}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskSaved={() => {
          // Task saved
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
