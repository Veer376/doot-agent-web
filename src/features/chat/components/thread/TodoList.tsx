"use client";

/**
 * TodoList Component
 *
 * Displays a list of todos from the agent state with expandable functionality.
 * - Default: Shows only completed task + next task (2 tasks max, single line)
 * - Hover: Visual hint that it can be expanded (arrow animation)
 * - Click: Toggles expanded state
 * - Expanded: Shows all tasks with smooth height transition and scrolling
 */

import { cn } from "@/lib/utils";
import { Clock01Icon, Tick02Icon, ArrowDown01Icon } from "hugeicons-react";
import { useState } from "react";

/**
 * Todo item from agent state
 */
export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

/**
 * Get status icon for a todo
 */
function StatusIcon({ status }: { status: Todo["status"] }) {
  switch (status) {
    case "pending":
      return (
        <div className="border-muted-foreground/50 h-4 w-4 rounded-full border-2" />
      );
    case "in_progress":
      return <Clock01Icon className="h-4 w-4 text-primary" />;
    case "completed":
      return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
          <Tick02Icon
            className="h-3 w-3 text-white"
            strokeWidth={2.5}
          />
        </div>
      );
    case "cancelled":
      return (
        <div className="bg-muted-foreground/30 flex h-4 w-4 items-center justify-center rounded-full">
          <svg
            className="h-3 w-3 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
  }
}

/**
 * Get status-specific text styling
 */
function getStatusStyles(status: Todo["status"]): string {
  switch (status) {
    case "completed":
      return "line-through text-muted-foreground";
    case "cancelled":
      return "line-through text-muted-foreground/50";
    case "in_progress":
      return "text-primary font-medium";
    default:
      return "text-foreground";
  }
}

interface TodoListProps {
  todos: Todo[];
  className?: string;
  /**
   * Enable expandable mode (default: false for backward compatibility)
   */
  expandable?: boolean;
}

/**
 * Get the tasks to show in collapsed mode (only in-progress task)
 */
function getCollapsedTasks(todos: Todo[]): Todo[] {
  const inProgressTask = todos.find((t) => t.status === "in_progress");

  return inProgressTask ? [inProgressTask] : [];
}

/**
 * TodoList component for displaying agent todos
 */
export function TodoList({
  todos,
  className,
  expandable = false,
}: TodoListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!todos || todos.length === 0) {
    return null;
  }

  // Determine which tasks to show
  const collapsedTasks = getCollapsedTasks(todos);
  const visibleTodos =
    expandable && isExpanded ? todos : expandable ? collapsedTasks : todos;
  const hasMoreTasks = todos.length > visibleTodos.length;
  const canToggle = todos.length > collapsedTasks.length;

  const handleClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleMouseEnter = () => {
    if (expandable) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (expandable) {
      setIsHovered(false);
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="relative mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </h4>
          <span className="text-xs text-muted-foreground">
            {todos.filter((t) => t.status === "completed").length}/
            {todos.length}
          </span>
        </div>

        {/* Expand/Collapse Indicator - Top right corner */}
        {expandable && canToggle && (
          <div
            className={cn(
              "transition-opacity duration-200",
              isHovered ? "opacity-100" : "opacity-0",
            )}
          >
            <ArrowDown01Icon
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300",
                !isExpanded && "rotate-180",
              )}
            />
          </div>
        )}
      </div>

      {/* Task List Container with smooth height transition */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 ease-in-out",
        )}
        style={{
          maxHeight: isExpanded
            ? `${todos.length * 32 + 20}px`
            : `${visibleTodos.length * 32}px`,
        }}
      >
        {/* Top gradient fade - only when expanded */}
        {isExpanded && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-4 bg-gradient-to-b from-card to-transparent" />
        )}

        <ul
          className={cn("space-y-1", isExpanded && "overflow-y-auto py-2 pr-1")}
          style={{
            maxHeight: isExpanded ? "120px" : "none",
          }}
        >
          {visibleTodos.map((todo, index) => (
            <li
              key={todo.id ?? `todo-${index}`}
              className="flex items-start gap-2 text-sm"
            >
              <span className="mt-0.5 flex-shrink-0">
                <StatusIcon status={todo.status} />
              </span>
              <span
                className={cn(
                  "flex-1",
                  getStatusStyles(todo.status),
                  // Single line truncation when collapsed
                  !isExpanded && expandable && "line-clamp-1 truncate",
                )}
                title={!isExpanded ? todo.content : undefined}
              >
                {todo.content}
              </span>
            </li>
          ))}
        </ul>

        {/* Bottom gradient fade - only when expanded */}
        {isExpanded && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-4 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>

      {/* Hidden tasks indicator (only in collapsed state) */}
      {/* {expandable && !isExpanded && hasMoreTasks && (
        <p className="text-xs text-muted-foreground/70 mt-1.5 transition-opacity duration-200">
          +{todos.length - visibleTodos.length} more tasks
        </p>
      )} */}
    </div>
  );
}

export default TodoList;
