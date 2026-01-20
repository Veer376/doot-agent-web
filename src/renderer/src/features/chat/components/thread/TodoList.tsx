"use client";

/**
 * TodoList Component
 * 
 * Displays a list of todos from the agent state.
 * Shows todo status with appropriate icons and styling.
 */

import { cn } from "@/lib/utils";

/**
 * Todo item from agent state
 */
export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Get status icon for a todo
 */
function StatusIcon({ status }: { status: Todo['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
      );
    case 'in_progress':
      return (
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      );
    case 'completed':
      return (
        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'cancelled':
      return (
        <div className="h-4 w-4 rounded-full bg-muted-foreground/30 flex items-center justify-center">
          <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
  }
}

/**
 * Get status-specific text styling
 */
function getStatusStyles(status: Todo['status']): string {
  switch (status) {
    case 'completed':
      return 'line-through text-muted-foreground';
    case 'cancelled':
      return 'line-through text-muted-foreground/50';
    case 'in_progress':
      return 'text-primary font-medium';
    default:
      return 'text-foreground';
  }
}

interface TodoListProps {
  todos: Todo[];
  className?: string;
  maxVisible?: number;
}

/**
 * TodoList component for displaying agent todos in the PreviewPanel
 */
export function TodoList({ todos, className, maxVisible = 5 }: TodoListProps) {
  if (!todos || todos.length === 0) {
    return null;
  }

  const visibleTodos = maxVisible ? todos.slice(0, maxVisible) : todos;
  const hiddenCount = todos.length - visibleTodos.length;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tasks
        </h4>
        <span className="text-xs text-muted-foreground">
          {todos.filter(t => t.status === 'completed').length}/{todos.length}
        </span>
      </div>
      
      <ul className="space-y-1">
        {visibleTodos.map((todo) => (
          <li key={todo.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex-shrink-0">
              <StatusIcon status={todo.status} />
            </span>
            <span className={cn("flex-1", getStatusStyles(todo.status))}>
              {todo.content}
            </span>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground">
          +{hiddenCount} more tasks
        </p>
      )}
    </div>
  );
}

export default TodoList;
