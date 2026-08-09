import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, NotebookPen } from "lucide-react";

import { generateTicketSuggestion } from "@/lib/support-ai.functions";

import { addNote, listAiSuggestions, listNotes, type AiSuggestion, type TicketNote } from "./sessions";

const KINDS: Array<{ key: "triage" | "reply" | "summary"; label: string }> = [
  { key: "triage", label: "تصنيف وتوجيه" },
  { key: "reply", label: "مسودة رد" },
  { key: "summary", label: "ملخص" },
];

/** Internal notes + AI assistant for support agents. */
export function AgentAssistPanel({ ticketId }: { ticketId: string }) {
  const generate = useServerFn(generateTicketSuggestion);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [noteRows, suggestionRows] = await Promise.all([listNotes(ticketId), listAiSuggestions(ticketId)]);
      setNotes(noteRows);
      setSuggestions(suggestionRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الملاحظات");
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNote() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addNote(ticketId, body);
      setBody("");
      await load();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "تعذر حفظ الملاحظة");
    } finally {
      setBusy(false);
    }
  }

  async function ask(kind: "triage" | "reply" | "summary") {
    setBusy(true);
    setError(null);
    try {
      await generate({ data: { ticketId, kind } });
      await load();
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "تعذر توليد الاقتراح");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="sc-card">
        <h3>
          <Bot size={16} /> مساعد KOB الذكي
        </h3>
        {error && <div className="sc-error">{error}</div>}
        <div className="sc-ai-actions">
          {KINDS.map((kind) => (
            <button key={kind.key} disabled={busy} onClick={() => void ask(kind.key)}>
              {busy ? <Loader2 className="sc-spin" size={13} /> : null} {kind.label}
            </button>
          ))}
        </div>
        <ul className="sc-ai-list">
          {suggestions.slice(0, 4).map((item) => (
            <li key={item.id}>
              <b>{KINDS.find((kind) => kind.key === item.kind)?.label ?? item.kind}</b>
              <p>{item.content}</p>
              <time>{new Date(item.createdAt).toLocaleString("ar-SA")}</time>
            </li>
          ))}
          {!suggestions.length && <li className="sc-empty">لا توجد اقتراحات بعد.</li>}
        </ul>
      </section>

      <section className="sc-card">
        <h3>
          <NotebookPen size={16} /> ملاحظات داخلية
        </h3>
        <textarea rows={3} value={body} placeholder="ملاحظة داخلية لفريق KOB..." onChange={(event) => setBody(event.target.value)} />
        <button className="sc-primary" disabled={busy || !body.trim()} onClick={() => void saveNote()}>
          حفظ الملاحظة
        </button>
        <ul className="sc-note-list">
          {notes.slice(0, 6).map((note) => (
            <li key={note.id}>
              <p>{note.body}</p>
              <time>{new Date(note.createdAt).toLocaleString("ar-SA")}</time>
            </li>
          ))}
          {!notes.length && <li className="sc-empty">لا توجد ملاحظات.</li>}
        </ul>
      </section>
    </>
  );
}
