"use client";

import { useMemo } from "react";
import { CloseIcon } from "@/components/chat/icons";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import {
  flattenOutline,
  parseTexOutline,
  type OutlineNode,
  type OutlineTodo,
} from "@/lib/tex-outline";

export type StudioOutlinePanelProps = {
  note: string;
  onClose: () => void;
  /** Jump editor caret to a 1-based line. */
  onJumpToLine: (line: number) => void;
};

function TodoBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="vt-outline-badge" title={`${count} TODO${count === 1 ? "" : "s"}`}>
      {count}
    </span>
  );
}

function TodoRow({
  todo,
  onJumpToLine,
}: {
  todo: OutlineTodo;
  onJumpToLine: (line: number) => void;
}) {
  return (
    <button
      type="button"
      className="vt-outline-todo"
      onClick={() => onJumpToLine(todo.line)}
      title={`Line ${todo.line}`}
    >
      <span className="vt-outline-todo__kind">
        {todo.kind === "macro" ? "\\todo" : "TODO"}
      </span>
      <span className="vt-outline-todo__text truncate">{todo.text}</span>
    </button>
  );
}

function SectionRow({
  node,
  onJumpToLine,
}: {
  node: OutlineNode;
  onJumpToLine: (line: number) => void;
}) {
  return (
    <li className="vt-outline-item" style={{ paddingLeft: `${node.depth * 12}px` }}>
      <button
        type="button"
        className="vt-outline-row"
        onClick={() => onJumpToLine(node.line)}
        title={`Line ${node.line}`}
      >
        <span className="vt-outline-row__level" data-level={node.level}>
          {node.level.slice(0, 3)}
        </span>
        <span className="vt-outline-row__title truncate">{node.title}</span>
        <TodoBadge count={node.todoCount} />
      </button>
      {node.todos.length > 0 ? (
        <ul className="vt-outline-todos" aria-label={`TODOs in ${node.title}`}>
          {node.todos.map((todo) => (
            <li key={`${todo.line}-${todo.kind}-${todo.text}`}>
              <TodoRow todo={todo} onJumpToLine={onJumpToLine} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function StudioOutlinePanel({
  note,
  onClose,
  onJumpToLine,
}: StudioOutlinePanelProps) {
  const outline = useMemo(() => parseTexOutline(note), [note]);
  const flat = useMemo(() => flattenOutline(outline), [outline]);

  return (
    <div className="vt-outline-panel flex h-full min-h-0 flex-col">
      <SidePanelHeader
        title="Outline"
        meta={
          outline.totalTodos > 0 ? (
            <span>
              {outline.totalTodos} TODO{outline.totalTodos === 1 ? "" : "s"}
            </span>
          ) : (
            <span>{flat.length} section{flat.length === 1 ? "" : "s"}</span>
          )
        }
        actions={
          <button
            type="button"
            onClick={onClose}
            className="vt-panel-header__icon-btn"
            aria-label="Close outline"
          >
            <CloseIcon />
          </button>
        }
      />

      <div className="vt-outline-panel__body min-h-0 flex-1 overflow-y-auto">
        {outline.preambleTodos.length > 0 ? (
          <div className="vt-outline-preamble">
            <p className="vt-outline-preamble__label">Before first section</p>
            <ul className="vt-outline-todos" aria-label="Preamble TODOs">
              {outline.preambleTodos.map((todo) => (
                <li key={`pre-${todo.line}-${todo.text}`}>
                  <TodoRow todo={todo} onJumpToLine={onJumpToLine} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {flat.length === 0 && outline.preambleTodos.length === 0 ? (
          <p className="vt-outline-empty">
            No {"\\part"} / {"\\section"} headings yet. Add sectioning macros to
            see the outline.
          </p>
        ) : (
          <ul className="vt-outline-tree" aria-label="Document outline">
            {flat.map((node) => (
              <SectionRow
                key={node.id}
                node={node}
                onJumpToLine={onJumpToLine}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
