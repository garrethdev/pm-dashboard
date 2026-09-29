"use client";

/**
 * The Writing's mention editor (DEV-62), built for two uses: the Writing
 * itself and the conversation's box beside it (DEV-25). Text box names are
 * pills; `@` opens the menu; a pill pressed or dropped inserts the same
 * thing in both. Only plain text crosses the boundary.
 *
 * The editing logic is Codex's, from `codex/carousel-backend-foundation`
 * (2026-09-26), brought over with its helpers and their tests. What changed
 * here: the app's colour tokens, a placeholder, drop support, and the
 * single-line mode the conversation's box needs, where Enter sends.
 */
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { CopyRole } from "@/lib/carousel/template/validate";
import { cn } from "@/lib/utils";
import { deleteWritingMention, insertWritingMention, writingMentions, writingMentionSuggestions } from "@/lib/carousel/writer/mentions";
import { createWritingHistory, recordWritingEdit, moveWritingHistory } from "@/lib/carousel/writer/edit-history";

/** Selection offsets use the same plain text that is saved, not HTML lengths. */
function selectionOffsets(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return { start, end: start + range.toString().length };
}

function restoreCaret(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  let remaining = offset;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const pill = node.parentElement?.closest("[data-writing-mention]");
      if (pill) {
        if (remaining === 0) range.setStartBefore(pill);
        else range.setStartAfter(pill);
      } else range.setStart(node, remaining);
      range.collapse(true);
      break;
    }
    remaining -= length;
  }
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Where in the plain text a drop landed. */
function offsetAtPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null; caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  let node: Node | null = null;
  let offset = 0;
  const range = doc.caretRangeFromPoint?.(x, y);
  if (range) {
    node = range.startContainer;
    offset = range.startOffset;
  } else {
    const pos = doc.caretPositionFromPoint?.(x, y);
    if (pos) {
      node = pos.offsetNode;
      offset = pos.offset;
    }
  }
  if (!node || !root.contains(node)) return null;
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(node, offset);
  return before.toString().length;
}

export const PILL = "rounded-[6px] bg-pill-bg px-1 font-medium text-text-primary";

export function WritingEditor({
  value,
  roles,
  onChange,
  onSubmit,
  disabled = false,
  label = "Writing",
  placeholder,
  single = false,
  pills = true,
  aside,
  className,
}: {
  value: string;
  roles: readonly CopyRole[];
  onChange: (value: string) => void;
  /** The conversation's box: Enter sends, Shift+Enter is a new line. */
  onSubmit?: () => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  /** A short box rather than a page. */
  single?: boolean;
  /** The row of text box names under the box. */
  pills?: boolean;
  /** Sits beside the box on its row, such as the conversation's Send. */
  aside?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);
  const composing = useRef(false);
  const savedSelection = useRef({ start: value.length, end: value.length });
  const history = useRef(createWritingHistory({ text: value, caret: value.length }));
  const [menu, setMenu] = useState<ReturnType<typeof writingMentionSuggestions>>(null);
  const [highlight, setHighlight] = useState(0);
  const stale = new Set(writingMentions(value, roles).filter((token) => !token.role).map((token) => token.name)).size;
  const insertable = roles.filter((role) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(role.role));

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || composing.current) return;
    // A loaded version or a proposal starts a new local history. Parent
    // echoes of our own edits already match present and do not reset undo.
    if (history.current.present.text !== value) history.current = createWritingHistory({ text: value, caret: value.length });
    const selection = document.activeElement === element ? selectionOffsets(element) : null;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const token of writingMentions(value, roles)) {
      if (token.start > cursor) fragment.append(document.createTextNode(value.slice(cursor, token.start)));
      const pill = document.createElement("span");
      pill.textContent = token.text;
      pill.contentEditable = "false";
      pill.dataset.writingMention = token.name;
      pill.className = token.role ? PILL : "text-text-muted underline decoration-dotted";
      pill.title = token.role ? `${token.name}${token.role.max_chars ? `, at most ${token.role.max_chars} characters` : ""}` : "This text box no longer exists";
      fragment.append(pill);
      cursor = token.end;
    }
    if (cursor < value.length) fragment.append(document.createTextNode(value.slice(cursor)));
    element.replaceChildren(fragment);
    const target = caret.current ?? selection?.end;
    if (target !== undefined && target !== null) restoreCaret(element, Math.min(target, value.length));
    caret.current = null;
  }, [value, roles]);

  function capture() {
    const selection = root.current && selectionOffsets(root.current);
    if (selection) savedSelection.current = selection;
    return savedSelection.current;
  }
  function commit(text: string, nextCaret: number) {
    history.current = recordWritingEdit(history.current, { text: value, caret: Math.min(savedSelection.current.end, value.length) });
    history.current = recordWritingEdit(history.current, { text, caret: nextCaret });
    caret.current = nextCaret;
    savedSelection.current = { start: nextCaret, end: nextCaret };
    onChange(text);
    setMenu(null);
    root.current?.focus();
  }
  function navigateHistory(direction: "undo" | "redo") {
    history.current = moveWritingHistory(history.current, direction);
    const next = history.current.present;
    caret.current = next.caret;
    savedSelection.current = { start: next.caret, end: next.caret };
    setMenu(null);
    onChange(next.text);
  }
  function choose(name: string, at?: { start: number; end: number }) {
    const selection = at ?? menu ?? savedSelection.current;
    const start = Math.min(selection.start, value.length);
    const inserted = insertWritingMention(value, start, Math.min(Math.max(selection.end, start), value.length), name, roles);
    commit(inserted.text, inserted.caret);
  }
  function replaceSelection(text: string) {
    const selection = capture();
    commit(value.slice(0, selection.start) + text + value.slice(selection.end), selection.start + text.length);
  }
  function readInput() {
    if (composing.current || !root.current) return;
    const text = root.current.textContent ?? "";
    const selection = capture();
    history.current = recordWritingEdit(history.current, { text, caret: selection.end });
    caret.current = selection.end;
    onChange(text);
    setMenu(selection.start === selection.end ? writingMentionSuggestions(text, selection.end, roles) : null);
    setHighlight(0);
  }

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {label && <span id={`${id}-label`} className="sr-only">{label}</span>}
      <div className={cn("relative", aside !== undefined && "flex items-end gap-2")}>
        <div
          ref={root}
          role="textbox"
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={label ? undefined : placeholder}
          aria-multiline={!single}
          aria-disabled={disabled}
          aria-describedby={`${id}-status`}
          aria-controls={menu ? `${id}-menu` : undefined}
          aria-activedescendant={menu ? `${id}-option-${highlight}` : undefined}
          data-placeholder={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "w-full min-w-0 flex-1 whitespace-pre-wrap break-words border border-border text-sm outline-none focus:border-text-muted empty:before:pointer-events-none empty:before:text-text-placeholder empty:before:content-[attr(data-placeholder)]",
            single ? "max-h-32 min-h-9 overflow-y-auto rounded-[18px] bg-card-raised px-3.5 py-1.5" : "min-h-[336px] rounded-nested bg-bg/60 px-4 py-3 leading-6",
            disabled && "opacity-60",
          )}
          onInput={readInput}
          onMouseUp={capture}
          onKeyUp={capture}
          onBlur={() => {
            capture();
            setMenu(null);
          }}
          onBeforeInput={(event) => {
            const type = (event.nativeEvent as InputEvent).inputType;
            if (disabled || composing.current) return;
            if (type === "historyUndo" || type === "historyRedo") {
              event.preventDefault();
              navigateHistory(type === "historyUndo" ? "undo" : "redo");
            } else {
              const selection = capture();
              history.current = recordWritingEdit(history.current, { text: value, caret: Math.min(selection.end, value.length) });
            }
          }}
          onCompositionStart={() => {
            composing.current = true;
            setMenu(null);
          }}
          onCompositionEnd={() => {
            composing.current = false;
            readInput();
          }}
          onPaste={(event) => {
            event.preventDefault();
            if (!disabled) replaceSelection(event.clipboardData.getData("text/plain"));
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (disabled || !root.current) return;
            // A pill dropped here inserts what a pill pressed here inserts.
            const dropped = event.dataTransfer.getData("text/plain").trim();
            const name = /^@([a-zA-Z][a-zA-Z0-9_-]*)$/.exec(dropped)?.[1];
            const at = offsetAtPoint(root.current, event.clientX, event.clientY) ?? value.length;
            if (name && roles.some((r) => r.role === name)) choose(name, { start: at, end: at });
            else if (dropped) {
              savedSelection.current = { start: at, end: at };
              commit(value.slice(0, at) + dropped + value.slice(at), at + dropped.length);
            }
          }}
          onKeyDown={(event) => {
            if (disabled || composing.current || event.nativeEvent.isComposing) return;
            if ((event.metaKey || event.ctrlKey) && !event.altKey && ["z", "y"].includes(event.key.toLowerCase())) {
              event.preventDefault();
              event.stopPropagation();
              navigateHistory(event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo");
              return;
            }
            if (menu && event.key === "Escape") {
              event.preventDefault();
              setMenu(null);
              return;
            }
            if (menu && ["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setHighlight((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + menu.candidates.length) % menu.candidates.length);
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (menu) choose(menu.candidates[highlight].role);
              else if (onSubmit && !event.shiftKey) onSubmit();
              else replaceSelection("\n");
              return;
            }
            if (event.key === "Backspace" || event.key === "Delete") {
              const selection = capture();
              const deleted = deleteWritingMention(value, selection.start, selection.end, event.key === "Backspace" ? "backward" : "forward", roles);
              if (deleted) {
                event.preventDefault();
                commit(deleted.text, deleted.caret);
              }
            }
          }}
        />
        {menu && !disabled && (
          <ul id={`${id}-menu`} role="listbox" aria-label="Text boxes" className={cn("absolute left-0 z-30 max-h-56 w-64 overflow-y-auto rounded-nested border border-border glass-overlay p-1", single ? "bottom-full mb-1" : "top-full mt-1")}>
            {menu.candidates.map((role, index) => (
              <li key={role.role} id={`${id}-option-${index}`} role="option" aria-selected={index === highlight}>
                <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(role.role)} className={cn("flex w-full items-baseline gap-2 rounded-[8px] px-2 py-1 text-left text-sm", index === highlight && "bg-card-raised")}>
                  <span className="font-medium">@{role.role}</span>
                  <span className="ml-auto text-xs text-text-muted tnum">{role.max_chars === undefined ? "No limit" : `${role.max_chars} characters`}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {aside}
      </div>
      {pills && insertable.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Insert a text box">
          {!single && <span className="text-xs text-text-muted">Text boxes</span>}
          {insertable.map((role) => (
            <button
              type="button"
              key={role.role}
              disabled={disabled}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", `@${role.role}`)}
              onMouseDown={(event) => {
                capture();
                if (document.activeElement === root.current) event.preventDefault();
              }}
              onClick={() => choose(role.role)}
              className="rounded-full bg-pill-bg px-2.5 py-0.5 text-xs font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
            >
              @{role.role}
            </button>
          ))}
        </div>
      )}
      <p id={`${id}-status`} aria-live="polite" className={cn("text-xs text-text-muted", !stale && "sr-only")}>
        {stale ? `${stale} text ${stale === 1 ? "box no longer exists" : "boxes no longer exist"}` : "Type @ or press a text box to insert a mention."}
      </p>
    </section>
  );
}

/** Plain text with its mentions drawn as pills, for the conversation's messages. */
export function Mentioned({ text, roles }: { text: string; roles: readonly CopyRole[] }) {
  const out: React.ReactNode[] = [];
  let cursor = 0;
  writingMentions(text, roles).forEach((token, i) => {
    if (token.start > cursor) out.push(text.slice(cursor, token.start));
    out.push(token.role ? <span key={i} className={PILL}>{token.text}</span> : token.text);
    cursor = token.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return <>{out}</>;
}
