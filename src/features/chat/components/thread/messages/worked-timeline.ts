import type {
  ChainStep,
  RenderBlock,
} from "@/features/chat/utils/extract-chain-of-thought";

export type WorkedTimelineItem =
  | { type: "thinking"; step: Extract<ChainStep, { type: "thinking" }> }
  | { type: "tool"; step: Extract<ChainStep, { type: "tool" }> }
  | { type: "text"; content: string };

export type WorkedTimelineSegment =
  | { type: "item"; item: WorkedTimelineItem }
  | {
      type: "tool-group";
      tools: Array<Extract<ChainStep, { type: "tool" }>>;
      mode: "family" | "phase";
    };

export function flattenWorkedBlocks(
  blocks: RenderBlock[],
): WorkedTimelineItem[] {
  const items: WorkedTimelineItem[] = [];

  for (const block of blocks) {
    if (block.type === "thinking-group") {
      for (const step of block.steps) {
        items.push(
          step.type === "tool"
            ? { type: "tool", step }
            : { type: "thinking", step },
        );
      }
      continue;
    }

    if (block.type === "tools-only") {
      for (const step of block.tools) {
        if (step.type === "tool") items.push({ type: "tool", step });
      }
      continue;
    }

    items.push({ type: "text", content: block.content });
  }

  return items;
}

/**
 * Worked-tool compaction is intentionally progressive rather than immediate.
 *
 * The UI follows an "active tail -> sealed family -> sealed phase" model:
 *
 * 1. While the agent is still working, the newest same-tool family stays fully
 *    visible. If it runs execute_command three times, all three calls remain on
 *    screen so the user can see exactly what is happening now.
 * 2. When a different tool arrives, the previous same-tool family is historical
 *    and is sealed into one family group (execute_commands, write_todos, etc.).
 * 3. When a non-tool step arrives (thinking/text), that contiguous tool phase is
 *    finished. All of its tool families are compacted into one phase summary,
 *    e.g. "execute_commands · write_todos · apply_patches".
 * 4. When the whole turn finishes, the final still-open tool phase is sealed too.
 * 5. Tool phases never merge across thinking/text boundaries. Chronology stays
 *    visible even after compaction.
 *
 * The result is simple: current work is explicit; finished work is compressed.
 */
export function compactWorkedTimeline(
  items: WorkedTimelineItem[],
  isWorking: boolean,
): WorkedTimelineSegment[] {
  const segments: WorkedTimelineSegment[] = [];

  for (let index = 0; index < items.length; ) {
    const item = items[index];
    if (item.type !== "tool") {
      segments.push({ type: "item", item });
      index += 1;
      continue;
    }

    const phase: Array<Extract<ChainStep, { type: "tool" }>> = [];
    let nextIndex = index;
    while (nextIndex < items.length && items[nextIndex].type === "tool") {
      phase.push((items[nextIndex] as Extract<WorkedTimelineItem, { type: "tool" }>).step);
      nextIndex += 1;
    }

    // A phase is sealed when thinking/text follows it, or when the run itself
    // has ended. A sealed phase can be summarized as one historical unit.
    const phaseIsSealed = nextIndex < items.length || !isWorking;
    if (phaseIsSealed) {
      if (phase.length === 1) {
        segments.push({ type: "item", item: { type: "tool", step: phase[0] } });
      } else {
        segments.push({ type: "tool-group", tools: phase, mode: "phase" });
      }
      index = nextIndex;
      continue;
    }

    // This is the active tool phase at the end of a still-running turn.
    // Seal every completed family, but leave the newest family fully visible.
    const families: Array<Array<Extract<ChainStep, { type: "tool" }>>> = [];
    for (const tool of phase) {
      const currentFamily = families.at(-1);
      if (currentFamily?.[0]?.toolCall.name === tool.toolCall.name) {
        currentFamily.push(tool);
      } else {
        families.push([tool]);
      }
    }

    families.forEach((family, familyIndex) => {
      const isActiveFamily = familyIndex === families.length - 1;
      if (isActiveFamily) {
        for (const tool of family) {
          segments.push({ type: "item", item: { type: "tool", step: tool } });
        }
        return;
      }

      if (family.length === 1) {
        segments.push({ type: "item", item: { type: "tool", step: family[0] } });
      } else {
        segments.push({ type: "tool-group", tools: family, mode: "family" });
      }
    });

    index = nextIndex;
  }

  return segments;
}
