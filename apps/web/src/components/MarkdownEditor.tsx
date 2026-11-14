import { useState } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Code, Link2, Table, Minus, Eye, Pencil } from "lucide-react";
import { Markdown } from "./Markdown";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after = before, placeholder = "") {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e) || placeholder;
  const next = value.slice(0, s) + before + selected + after + value.slice(e);
  textarea.value = next;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(s + before.length, s + before.length + selected.length);
  });
}

export function MarkdownEditor({ value, onChange, placeholder, minHeight = "16rem" }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [ta, setTa] = useState<HTMLTextAreaElement | null>(null);

  const tools: { icon: React.ReactNode; title: string; action: () => void }[] = [
    { icon: <Heading2 size={15} />, title: "Heading", action: () => ta && wrapSelection(ta, "## ", "", "Heading") },
    { icon: <Heading3 size={15} />, title: "Subheading", action: () => ta && wrapSelection(ta, "### ", "", "Subheading") },
    { icon: <Bold size={15} />, title: "Bold", action: () => ta && wrapSelection(ta, "**", "**", "bold text") },
    { icon: <Italic size={15} />, title: "Italic", action: () => ta && wrapSelection(ta, "*", "*", "italic text") },
    { icon: <Code size={15} />, title: "Code", action: () => ta && wrapSelection(ta, "`", "`", "code") },
    { icon: <Code size={15} />, title: "Code block", action: () => ta && wrapSelection(ta, "```\n", "\n```", "code") },
    { icon: <List size={15} />, title: "List", action: () => ta && wrapSelection(ta, "- ", "", "item") },
    { icon: <ListOrdered size={15} />, title: "Ordered list", action: () => ta && wrapSelection(ta, "1. ", "", "item") },
    { icon: <Quote size={15} />, title: "Quote", action: () => ta && wrapSelection(ta, "> ", "", "quote") },
    { icon: <Link2 size={15} />, title: "Link", action: () => ta && wrapSelection(ta, "[", "](https://)", "link text") },
    { icon: <Table size={15} />, title: "Table", action: () => ta && wrapSelection(ta, "\n| A | B |\n|---|---|\n| 1 | 2 |\n", "", "") },
    { icon: <Minus size={15} />, title: "Horizontal rule", action: () => ta && wrapSelection(ta, "\n\n---\n\n", "", "") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-0.5">
          {tools.map((t, i) => (
            <button key={i} type="button" onClick={t.action} title={t.title}
              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white">
              {t.icon}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg bg-zinc-200 p-0.5 dark:bg-zinc-800">
          {([["write", Pencil, "Write"], ["preview", Eye, "Preview"]] as const).map(([k, Icon, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${tab === k ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500"}`}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
      </div>
      {tab === "write" ? (
        <textarea
          ref={setTa}
          value={value}
          onChange={(e) => {
            // mirror into React state; the toolbar writes via native setter + input event
            onChange(e.target.value);
          }}
          onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          placeholder={placeholder ?? "Write in Markdown…"}
          className="w-full resize-y bg-transparent p-4 font-mono text-sm focus:outline-none"
          style={{ minHeight }}
          spellCheck={false}
        />
      ) : (
        <div className="min-h-48 p-4" style={{ minHeight }}>
          {value.trim() ? <Markdown content={value} /> : <p className="text-sm text-zinc-400">Nothing to preview.</p>}
        </div>
      )}
    </div>
  );
}
