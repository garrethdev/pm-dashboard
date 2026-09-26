"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { CopyRole } from "@/lib/carousel/template/validate";
import { deleteWritingMention, insertWritingMention, writingMentions, writingMentionSuggestions } from "@/lib/carousel/writer/mentions";
import { createWritingHistory, recordWritingEdit, moveWritingHistory } from "@/lib/carousel/writer/edit-history";

/** Selection offsets use the same plain text that is saved, not HTML lengths. */
function selectionOffsets(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = range.cloneRange(); before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return { start, end: start + range.toString().length };
}

function restoreCaret(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null, remaining = offset;
  const range = document.createRange();
  range.selectNodeContents(root); range.collapse(false);
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const pill = node.parentElement?.closest("[data-writing-mention]");
      if (pill) {
        if (remaining === 0) range.setStartBefore(pill);
        else range.setStartAfter(pill);
      }
      else range.setStart(node, remaining);
      range.collapse(true); break;
    }
    remaining -= length;
  }
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
}

/** Reusable controlled editor for a client parent. Only plain text crosses the
 * boundary; save/version authorization belongs to the parent/repository. The
 * parent supplies painted roles, not the template's hidden metadata fields. */
export function WritingEditor({ value, roles, onChange, disabled = false }: {
  value: string; roles: readonly CopyRole[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId(), root = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null), composing = useRef(false);
  const savedSelection = useRef({ start: value.length, end: value.length });
  const history = useRef(createWritingHistory({ text: value, caret: value.length }));
  const [menu, setMenu] = useState<ReturnType<typeof writingMentionSuggestions>>(null);
  const [highlight, setHighlight] = useState(0);
  const stale = new Set(writingMentions(value, roles).filter(token => !token.role).map(token => token.name)).size;

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || composing.current) return;
    // A loaded version/server replacement starts a new local history. Parent
    // echoes of our own edits already match present and do not reset undo.
    if (history.current.present.text !== value) history.current = createWritingHistory({ text: value, caret: value.length });
    const selection = document.activeElement === element ? selectionOffsets(element) : null;
    const fragment = document.createDocumentFragment(); let cursor = 0;
    for (const token of writingMentions(value, roles)) {
      fragment.append(document.createTextNode(value.slice(cursor, token.start)));
      const pill = document.createElement("span");
      pill.textContent = token.text; pill.contentEditable = "false";
      pill.dataset.writingMention = token.name;
      pill.className = token.role ? "rounded bg-neutral-200 px-1 font-mono dark:bg-neutral-700" : "font-mono text-neutral-500 underline decoration-dotted";
      pill.title = token.role ? `${token.name}${token.role.max_chars ? ` · ${token.role.max_chars} characters` : ""}` : "Text box no longer exists";
      fragment.append(pill); cursor = token.end;
    }
    fragment.append(document.createTextNode(value.slice(cursor)));
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
    caret.current = nextCaret; savedSelection.current = { start: nextCaret, end: nextCaret };
    onChange(text); setMenu(null); root.current?.focus();
  }
  function navigateHistory(direction: "undo" | "redo") {
    history.current = moveWritingHistory(history.current, direction);
    const next = history.current.present;
    caret.current = next.caret; savedSelection.current = { start: next.caret, end: next.caret };
    setMenu(null); onChange(next.text);
  }
  function choose(name: string) {
    const selection = menu ?? savedSelection.current;
    const inserted = insertWritingMention(value, selection.start, selection.end, name, roles);
    commit(inserted.text, inserted.caret);
  }
  function replaceSelection(text: string) {
    const selection = capture();
    commit(value.slice(0, selection.start) + text + value.slice(selection.end), selection.start + text.length);
  }
  function readInput() {
    if (composing.current || !root.current) return;
    const text = root.current.textContent ?? "", selection = capture();
    history.current = recordWritingEdit(history.current, { text, caret: selection.end });
    caret.current = selection.end; onChange(text);
    setMenu(selection.start === selection.end ? writingMentionSuggestions(text, selection.end, roles) : null);
    setHighlight(0);
  }
  return <section className="space-y-2">
    <label id={`${id}-label`} className="text-sm font-medium">Writing</label>
    <div ref={root} role="textbox" aria-labelledby={`${id}-label`} aria-multiline="true" aria-disabled={disabled}
      aria-describedby={`${id}-status`} aria-controls={menu ? `${id}-menu` : undefined}
      aria-activedescendant={menu ? `${id}-option-${highlight}` : undefined}
      contentEditable={!disabled} suppressContentEditableWarning tabIndex={disabled ? -1 : 0}
      className="min-h-36 whitespace-pre-wrap rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700"
      onInput={readInput} onMouseUp={capture} onBlur={() => { capture(); setMenu(null); }}
      onBeforeInput={event => {
        const type = (event.nativeEvent as InputEvent).inputType;
        if (disabled || composing.current) return;
        if (type === "historyUndo" || type === "historyRedo") {
          event.preventDefault(); navigateHistory(type === "historyUndo" ? "undo" : "redo");
        } else {
          const selection = capture();
          history.current = recordWritingEdit(history.current, { text: value, caret: Math.min(selection.end, value.length) });
        }
      }}
      onCompositionStart={() => { composing.current = true; setMenu(null); }}
      onCompositionEnd={() => { composing.current = false; readInput(); }}
      onPaste={event => { event.preventDefault(); if (!disabled) replaceSelection(event.clipboardData.getData("text/plain")); }}
      onDrop={event => { event.preventDefault(); }}
      onKeyDown={event => {
        if (disabled || composing.current || event.nativeEvent.isComposing) return;
        if ((event.metaKey || event.ctrlKey) && !event.altKey && ["z", "y"].includes(event.key.toLowerCase())) {
          event.preventDefault(); navigateHistory(event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo"); return;
        }
        if (menu && event.key === "Escape") { event.preventDefault(); setMenu(null); return; }
        if (menu && ["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault(); setHighlight(index => (index + (event.key === "ArrowDown" ? 1 : -1) + menu.candidates.length) % menu.candidates.length); return;
        }
        if (event.key === "Enter") { event.preventDefault(); if (menu) choose(menu.candidates[highlight].role); else replaceSelection("\n"); return; }
        if (event.key === "Backspace" || event.key === "Delete") {
          const selection = capture();
          const deleted = deleteWritingMention(value, selection.start, selection.end, event.key === "Backspace" ? "backward" : "forward", roles);
          if (deleted) { event.preventDefault(); commit(deleted.text, deleted.caret); }
        }
      }} />
    {menu && !disabled && <ul id={`${id}-menu`} role="listbox" aria-label="Text boxes" className="rounded-lg border bg-white p-1 dark:bg-neutral-900">
      {menu.candidates.map((role, index) => <li key={role.role} id={`${id}-option-${index}`} role="option" aria-selected={index === highlight}>
        <button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => choose(role.role)} className={`w-full rounded px-2 py-1 text-left text-sm ${index === highlight ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}>
          @{role.role} <span className="text-neutral-500">{role.max_chars === undefined ? "No limit configured" : `${role.max_chars} characters`}</span>
        </button>
      </li>)}
    </ul>}
    <div className="flex flex-wrap gap-2" aria-label="Insert a text box">
      {roles.filter(role => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(role.role)).map(role => <button type="button" key={role.role} disabled={disabled}
        onMouseDown={event => { capture(); event.preventDefault(); }} onClick={() => choose(role.role)}
        className="rounded border px-2 py-1 font-mono text-xs disabled:opacity-50">@{role.role}</button>)}
    </div>
    <p id={`${id}-status`} aria-live="polite" className="text-xs text-neutral-500">{stale ? `${stale} text ${stale === 1 ? "box no longer exists" : "boxes no longer exist"}` : "Type @ or press a text box to insert a mention."}</p>
  </section>;
}
