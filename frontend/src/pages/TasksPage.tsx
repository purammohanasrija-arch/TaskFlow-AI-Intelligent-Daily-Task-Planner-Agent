import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Sparkles,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Kanban,
  List as ListIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Task, PriorityLevel, TaskStatus } from '../types';
import { NaturalLanguageModal } from '../components/NaturalLanguageModal';
import { GoalBreakdownModal } from '../components/GoalBreakdownModal';
import { TaskFormModal } from '../components/TaskFormModal';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Modals
  const [isNLModalOpen, setIsNLModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Subtask accordion expansion map
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});

  const categories = ['all', 'study', 'coding', 'work', 'health', 'personal', 'errand'];

  const loadTasks = async () => {
    setLoading(true);
    try {
      const fetched = await api.getTasks({
        search: search || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
      });
      setTasks(fetched);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [search, selectedCategory, selectedStatus, selectedPriority]);

  const handleToggleComplete = async (task: Task) => {
    try {
      if (task.status === 'completed') {
        const updated = await api.reopenTask(task.id);
        setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
      } else {
        const updated = await api.completeTask(task.id);
        setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
        // Confetti celebration
        try {
          confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.7 },
          });
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error toggling task completion', e);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (e) {
      console.error('Error deleting task', e);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      await api.seedDemoTasks();
      await loadTasks();
    } catch (e) {
      console.error('Failed to seed demo tasks', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubtaskAccordion = (taskId: string) => {
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const priorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
            My Tasks & Goals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Organized by deterministic priority score, urgency, and deadline proximity.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => setIsBreakdownModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-brand-purple dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold hover:bg-purple-100 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Break Down Goal</span>
          </button>

          <button
            onClick={() => setIsNLModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-emerald-600 text-white text-xs font-bold shadow hover:opacity-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Natural Language Add</span>
          </button>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* View mode toggle (List vs Board) */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-500'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all ${
                  viewMode === 'board'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-500'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
            </div>

            {tasks.length === 0 && (
              <button
                onClick={handleSeedDemo}
                className="text-xs px-3 py-1.5 rounded-xl border border-brand-primary text-brand-primary font-semibold hover:bg-brand-primary/10 transition-colors"
              >
                Load Demo Tasks
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl capitalize font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-primary text-white font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task Content: List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isOverdue = !isCompleted && task.due_date && new Date(task.due_date) < new Date();
              const hasSubtasks = task.subtasks && task.subtasks.length > 0;
              const completedSubtasks = task.subtasks?.filter((st) => st.completed).length || 0;
              const isExpanded = expandedSubtasks[task.id];

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-75'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Checkbox & Task details */}
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="mt-0.5 text-slate-400 hover:text-brand-primary transition-colors flex-shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3
                            className={`text-sm font-bold ${
                              isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </h3>

                          {/* Priority Badge */}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>

                          {/* Score Badge */}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            P-Score: {task.priority_score}/100
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2 flex-wrap gap-y-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{task.estimated_duration}m</span>
                          </span>

                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                            {task.category}
                          </span>

                          {task.due_date && (
                            <span
                              className={`flex items-center space-x-1 font-medium ${
                                isOverdue
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-500'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {new Date(task.due_date).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isOverdue && <span className="uppercase text-[10px]">(Overdue)</span>}
                            </span>
                          )}

                          {hasSubtasks && (
                            <button
                              onClick={() => toggleSubtaskAccordion(task.id)}
                              className="text-brand-purple dark:text-purple-300 font-semibold flex items-center space-x-1 hover:underline"
                            >
                              <span>
                                Subtasks ({completedSubtasks}/{task.subtasks.length})
                              </span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setTaskToEdit(task);
                          setIsFormModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtask checklist drawer */}
                  {hasSubtasks && isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 pl-8 space-y-1.5 animate-in slide-in-from-top-1">
                      {task.subtasks.map((st, i) => (
                        <div key={st.id || i} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {i + 1}
                            </span>
                            <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.title}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">{st.estimated_duration}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-heading font-bold text-base text-slate-800 dark:text-slate-200">
                No tasks found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tasks match your current filters. Add a new task using natural language or seed sample tasks!
              </p>
              <div className="pt-2 flex justify-center space-x-2">
                <button
                  onClick={() => setIsNLModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold shadow"
                >
                  Quick Add Task
                </button>
                <button
                  onClick={handleSeedDemo}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                >
                  Load Sample Tasks
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Content: Board (Kanban) View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'pending', title: 'Pending', count: tasks.filter((t) => t.status === 'pending').length },
            { id: 'in_progress', title: 'In Progress', count: tasks.filter((t) => t.status === 'in_progress').length },
            { id: 'completed', title: 'Completed', count: tasks.filter((t) => t.status === 'completed').length },
          ].map((col) => (
            <div key={col.id} className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold font-heading text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {col.title}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {col.count}
                </span>
              </div>

              <div className="space-y-2.5">
                {tasks
                  .filter((t) => t.status === col.id)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${priorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-slate-400 font-semibold">{task.estimated_duration}m</span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        {task.title}
                      </h4>
                      <div className="flex items-center justify-between pt-1">
                        <span className="capitalize text-[11px] text-slate-500 font-medium">
                          {task.category}
                        </span>
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="text-[11px] font-semibold text-brand-primary hover:underline"
                        >
                          {task.status === 'completed' ? 'Reopen' : 'Complete'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <NaturalLanguageModal
        isOpen={isNLModalOpen}
        onClose={() => setIsNLModalOpen(false)}
        onTaskCreated={() => loadTasks()}
      />

      <GoalBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        onTasksGenerated={() => loadTasks()}
      />

      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onTaskSaved={() => loadTasks()}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};
