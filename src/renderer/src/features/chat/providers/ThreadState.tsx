"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ============================================================================
// Types
// ============================================================================

/**
 * Represents an open file tab
 */
export interface OpenFile {
  path: string;
  name: string;
}

/**
 * File information for workspace tree
 */
export interface FileInfo {
  path: string;
  is_dir?: boolean;
  size?: number;
}

/**
 * Token usage tracking for context window monitoring
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  lastUpdated: Date;
}

/**
 * Per-thread state for file management
 */
export interface ThreadFileState {
  openFiles: OpenFile[];
  activeTab: "agent" | string; // "agent" for chat, or file path
  fileContents: Record<string, string>;
  workspaceFiles: FileInfo[];
  workspacePath: string | null;
  tokenUsage: TokenUsage | null;
}

/**
 * Actions available for thread file management
 */
export interface ThreadFileActions {
  openFile: (path: string, name: string) => void;
  closeFile: (path: string) => void;
  setActiveTab: (tab: "agent" | string) => void;
  setFileContents: (path: string, content: string) => void;
  setWorkspaceFiles: (
    files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[]),
  ) => void;
  setWorkspacePath: (path: string | null) => void;
  setTokenUsage: (usage: TokenUsage | null) => void;
}

/**
 * Combined thread state with actions
 */
export type ThreadStateWithActions = ThreadFileState & ThreadFileActions;

// ============================================================================
// Default State
// ============================================================================

const createDefaultThreadState = (): ThreadFileState => ({
  openFiles: [],
  activeTab: "agent",
  fileContents: {},
  workspaceFiles: [],
  workspacePath: null,
  tokenUsage: null,
});

// ============================================================================
// Context
// ============================================================================

interface ThreadStateContextValue {
  getThreadState: (threadId: string | null) => ThreadFileState;
  getThreadActions: (threadId: string | null) => ThreadFileActions;
  // Panel visibility state
  isRightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  rightPanelWidth: number;
  setRightPanelWidth: (width: number) => void;
}

const ThreadStateContext = createContext<ThreadStateContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ThreadStateProviderProps {
  children: ReactNode;
}

export function ThreadStateProvider({ children }: ThreadStateProviderProps) {
  const [threadStates, setThreadStates] = useState<
    Record<string, ThreadFileState>
  >({});
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const actionsCache = useRef<Record<string, ThreadFileActions>>({});

  /**
   * Get the current state for a thread
   */
  const getThreadState = useCallback(
    (threadId: string | null): ThreadFileState => {
      if (!threadId) return createDefaultThreadState();
      return threadStates[threadId] || createDefaultThreadState();
    },
    [threadStates],
  );

  /**
   * Update thread state with partial updates
   */
  const updateThreadState = useCallback(
    (
      threadId: string | null,
      updater: (prev: ThreadFileState) => Partial<ThreadFileState>,
    ) => {
      if (!threadId) return;
      setThreadStates((prev) => {
        const currentState = prev[threadId] || createDefaultThreadState();
        const updates = updater(currentState);
        return {
          ...prev,
          [threadId]: { ...currentState, ...updates },
        };
      });
    },
    [],
  );

  /**
   * Get actions for managing a thread's file state
   */
  const getThreadActions = useCallback(
    (threadId: string | null): ThreadFileActions => {
      if (!threadId) {
        // Return no-op actions for null threadId
        return {
          openFile: () => {},
          closeFile: () => {},
          setActiveTab: () => {},
          setFileContents: () => {},
          setWorkspaceFiles: () => {},
          setWorkspacePath: () => {},
          setTokenUsage: () => {},
        };
      }

      if (actionsCache.current[threadId]) {
        return actionsCache.current[threadId];
      }

      const actions: ThreadFileActions = {
        openFile: (path: string, name: string) => {
          updateThreadState(threadId, (state) => {
            // If file is already open, just switch to it
            if (state.openFiles.some((f) => f.path === path)) {
              return { activeTab: path };
            }
            // Otherwise add to open files and switch to it
            return {
              openFiles: [...state.openFiles, { path, name }],
              activeTab: path,
            };
          });
          // Auto-open right panel when opening a file
          setRightPanelOpen(true);
        },

        closeFile: (path: string) => {
          updateThreadState(threadId, (state) => {
            const newOpenFiles = state.openFiles.filter((f) => f.path !== path);
            const { [path]: _, ...newFileContents } = state.fileContents;

            // Determine new active tab if we're closing the current one
            let newActiveTab = state.activeTab;
            if (state.activeTab === path) {
              const closedIndex = state.openFiles.findIndex(
                (f) => f.path === path,
              );
              if (newOpenFiles.length === 0) {
                newActiveTab = "agent";
              } else if (closedIndex > 0) {
                newActiveTab = newOpenFiles[closedIndex - 1].path;
              } else {
                newActiveTab = newOpenFiles[0].path;
              }
            }

            return {
              openFiles: newOpenFiles,
              activeTab: newActiveTab,
              fileContents: newFileContents,
            };
          });
        },

        setActiveTab: (tab: "agent" | string) => {
          updateThreadState(threadId, () => ({ activeTab: tab }));
        },

        setFileContents: (path: string, content: string) => {
          updateThreadState(threadId, (state) => ({
            fileContents: { ...state.fileContents, [path]: content },
          }));
        },

        setWorkspaceFiles: (
          files: FileInfo[] | ((prev: FileInfo[]) => FileInfo[]),
        ) => {
          updateThreadState(threadId, (state) => ({
            workspaceFiles:
              typeof files === "function" ? files(state.workspaceFiles) : files,
          }));
        },

        setWorkspacePath: (path: string | null) => {
          updateThreadState(threadId, () => ({ workspacePath: path }));
        },

        setTokenUsage: (usage: TokenUsage | null) => {
          updateThreadState(threadId, () => ({ tokenUsage: usage }));
        },
      };

      actionsCache.current[threadId] = actions;
      return actions;
    },
    [updateThreadState],
  );

  const contextValue = useMemo(
    () => ({
      getThreadState,
      getThreadActions,
      isRightPanelOpen,
      setRightPanelOpen,
      rightPanelWidth,
      setRightPanelWidth,
    }),
    [getThreadState, getThreadActions, isRightPanelOpen, rightPanelWidth],
  );

  return (
    <ThreadStateContext.Provider value={contextValue}>
      {children}
    </ThreadStateContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the thread state context
 */
export function useThreadStateContext(): ThreadStateContextValue {
  const context = useContext(ThreadStateContext);
  if (!context) {
    throw new Error(
      "useThreadStateContext must be used within a ThreadStateProvider",
    );
  }
  return context;
}

/**
 * Get file state and actions for a specific thread
 */
export function useThreadFileState(
  threadId: string | null,
): ThreadStateWithActions {
  const { getThreadState, getThreadActions } = useThreadStateContext();
  const state = getThreadState(threadId);
  const actions = getThreadActions(threadId);

  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

/**
 * Get the current thread's state (for components that need it)
 */
export function useCurrentThreadFileState(threadId: string | null) {
  return useThreadFileState(threadId);
}

/**
 * Access right panel visibility controls
 */
export function useRightPanel() {
  const {
    isRightPanelOpen,
    setRightPanelOpen,
    rightPanelWidth,
    setRightPanelWidth,
  } = useThreadStateContext();

  return {
    isOpen: isRightPanelOpen,
    setOpen: setRightPanelOpen,
    width: rightPanelWidth,
    setWidth: setRightPanelWidth,
    toggle: useCallback(
      () => setRightPanelOpen(!isRightPanelOpen),
      [isRightPanelOpen, setRightPanelOpen],
    ),
  };
}
