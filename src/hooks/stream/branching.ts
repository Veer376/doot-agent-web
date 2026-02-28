"use client";

/**
 * Branching logic for thread state history.
 *
 * Ported from @langchain/langgraph-sdk/ui/branching.js
 * This is the key module for calculating branch options -
 * modifications here will fix the branch limitation issue.
 */

import type { ThreadState } from "@langchain/langgraph-sdk";
import type {
  BranchSequence,
  BranchNode,
  BranchFork,
  BranchInfo,
  BranchContext,
} from "./types";

// Path separator for branch IDs
const PATH_SEP = ">";
const ROOT_ID = "$";

/**
 * Build branch sequence tree from thread history.
 *
 * Creates a tree structure representing all branches in the thread.
 * Each fork point creates multiple paths through the tree.
 */
function getBranchSequence<StateType extends Record<string, unknown>>(
  history: ThreadState<StateType>[],
): {
  rootSequence: BranchSequence<StateType>;
  paths: string[][];
} {
  const nodeIds = new Set<string>();
  const childrenMap: Record<string, ThreadState<StateType>[]> = {};

  // Handle empty or single-item history
  if (history.length <= 1) {
    return {
      rootSequence: {
        type: "sequence",
        items: history.map((value) => ({
          type: "node",
          value,
          path: [],
        })),
      },
      paths: [],
    };
  }

  // Build parent -> children map
  history.forEach((state) => {
    const checkpointId = state.parent_checkpoint?.checkpoint_id ?? ROOT_ID;
    childrenMap[checkpointId] ??= [];
    childrenMap[checkpointId].push(state);
    if (state.checkpoint?.checkpoint_id != null) {
      nodeIds.add(state.checkpoint.checkpoint_id);
    }
  });

  // Helper to get max ID (lexicographically)
  const maxId = (...ids: (string | undefined)[]): string | undefined =>
    ids
      .filter((i): i is string => i != null)
      .sort((a, b) => a.localeCompare(b))
      .at(-1);

  // Handle orphaned nodes (nodes whose parents aren't in history)
  const lastOrphanedNode =
    childrenMap[ROOT_ID] == null
      ? Object.keys(childrenMap)
          .filter((parentId) => !nodeIds.has(parentId))
          .map((parentId) => {
            const queue: string[] = [parentId];
            const seen = new Set<string>();
            let lastId = parentId;

            while (queue.length > 0) {
              const current = queue.shift()!;
              if (seen.has(current)) continue;
              seen.add(current);
              const children = (childrenMap[current] ?? []).flatMap(
                (i) => i.checkpoint?.checkpoint_id ?? [],
              );
              lastId = maxId(lastId, ...children) ?? lastId;
              queue.push(...children);
            }

            return { parentId, lastId };
          })
          .sort((a, b) => a.lastId.localeCompare(b.lastId))
          .at(-1)?.parentId
      : undefined;

  if (lastOrphanedNode != null) {
    childrenMap[ROOT_ID] = childrenMap[lastOrphanedNode];
  }

  // Build the tree using BFS
  const rootSequence: BranchSequence<StateType> = {
    type: "sequence",
    items: [],
  };

  const queue: Array<{
    id: string;
    sequence: BranchSequence<StateType>;
    path: string[];
  }> = [{ id: ROOT_ID, sequence: rootSequence, path: [] }];

  const paths: string[][] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const task = queue.shift()!;
    if (visited.has(task.id)) continue;
    visited.add(task.id);

    const children = childrenMap[task.id];
    if (children == null || children.length === 0) continue;

    // Create fork if multiple children
    let fork: BranchFork<StateType> | undefined;
    if (children.length > 1) {
      fork = { type: "fork", items: [] };
      task.sequence.items.push(fork);
    }

    // Process each child
    for (const value of children) {
      const id = value.checkpoint?.checkpoint_id;
      if (id == null) continue;

      let { sequence } = task;
      let { path } = task;

      if (fork != null) {
        // Create new sequence for this branch
        sequence = { type: "sequence", items: [] };
        fork.items.unshift(sequence);
        path = path.slice();
        path.push(id);
        paths.push(path);
      }

      // Add node to sequence
      sequence.items.push({
        type: "node",
        value,
        path,
      });

      // Queue children of this node
      queue.push({ id, sequence, path });
    }
  }

  return { rootSequence, paths };
}

/**
 * Get flattened view of branch for a given branch path.
 *
 * Traverses the branch tree following the specified branch
 * and returns the linear history for that branch.
 */
function getBranchView<StateType extends Record<string, unknown>>(
  sequence: BranchSequence<StateType>,
  paths: string[][],
  branch: string,
): {
  history: ThreadState<StateType>[];
  branchByCheckpoint: Record<string, BranchInfo>;
} {
  const path = branch.split(PATH_SEP).filter(Boolean);

  // Build map of parent -> child paths
  const pathMap: Record<string, string[][]> = {};
  for (const p of paths) {
    const parent = p.at(-2) ?? ROOT_ID;
    pathMap[parent] ??= [];
    pathMap[parent].unshift(p);
  }

  const history: ThreadState<StateType>[] = [];
  const branchByCheckpoint: Record<string, BranchInfo> = {};
  const forkStack = path.slice();

  // BFS through the tree following our branch
  const queue: (BranchNode<StateType> | BranchFork<StateType>)[] = [
    ...sequence.items,
  ];

  while (queue.length > 0) {
    const item = queue.shift()!;

    if (item.type === "node") {
      history.push(item.value);

      const checkpointId = item.value.checkpoint?.checkpoint_id;
      if (checkpointId == null) continue;

      // Record branch info for this checkpoint
      branchByCheckpoint[checkpointId] = {
        branch: item.path.join(PATH_SEP),
        branchOptions: (item.path.length > 0
          ? (pathMap[item.path.at(-2) ?? ROOT_ID] ?? [])
          : []
        ).map((p) => p.join(PATH_SEP)),
      };
    }

    if (item.type === "fork") {
      // Follow the correct fork based on our path
      const forkId = forkStack.shift();
      const index =
        forkId != null
          ? item.items.findIndex((value) => {
              const firstItem = value.items.at(0);
              if (!firstItem || firstItem.type !== "node") return false;
              return firstItem.value.checkpoint?.checkpoint_id === forkId;
            })
          : -1;

      const nextItems = item.items.at(index)?.items ?? [];
      queue.push(...nextItems);
    }
  }

  return { history, branchByCheckpoint };
}

/**
 * Get complete branch context for current branch and history.
 *
 * This is the main entry point for branch calculations.
 * Returns the branch tree, flattened history, checkpoint mapping,
 * and the current thread head.
 */
export function getBranchContext<StateType extends Record<string, unknown>>(
  branch: string,
  history: ThreadState<StateType>[] | undefined,
): BranchContext<StateType> {
  const { rootSequence: branchTree, paths } = getBranchSequence(history ?? []);
  const { history: flatHistory, branchByCheckpoint } = getBranchView(
    branchTree,
    paths,
    branch,
  );

  return {
    branchTree,
    flatHistory,
    branchByCheckpoint,
    threadHead: flatHistory.at(-1),
  };
}

export { PATH_SEP, ROOT_ID };
