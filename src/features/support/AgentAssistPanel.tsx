import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, FileText, MessageSquareText, NotebookPen, Sparkles } from "lucide-react";

import { generateTicketSuggestion } from "@/lib/support-ai.functions";
import { useI18n } from "@/lib/i18n";
import { Button, Card, CardBody, CardHeader, EmptyState, Textarea, kobToast } from "@/components/kob";

import { addNote, listAiSuggestions, listNotes, type AiSuggestion, type TicketNote } from "./sessions";

const KIND_ICONS = { triage: Sparkles, reply: MessageSquareText, summary: FileText } as const;

/** Internal notes + AI copilot for support agents. AI drafts always require explicit human approval before insertion. */
export function AgentAssistPanel({ ticketId }: { ticketId: string }) {
  const { t, fmtDate } = useI18n();
  const generate = useServerFn(generateTicketSuggestion);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const KINDS: Array<{ key: "triage" | "reply" | "summary"; label: string }> = [
    { key: "triage", label: t("support.assist.triage") },
    { key: "reply", label: t("support.assist.suggestReply") },
    { key: "summary", label: t("support.assist.summarize") },
  ];

  const load = useCallback(async () => {
    try {
      const [noteRows, suggestionRows] = await Promise.all([listNotes(ticketId), listAiSuggestions(ticketId)]);
      setNotes(noteRows);
      setSuggestions(suggestionRows);
    } catch (loadError) {
      kobToast.error(loadError instanceof Error ? loadError.message : t("support.assist.generateError"));
    }
  }, [ticketId, t]);

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
      kobToast.success(t("support.assist.noteSaved"));
    } catch (noteError) {
      kobToast.error(t("support.assist.noteError"));
    } finally {
      setBusy(false);
    }
  }

  async function ask(kind: "triage" | "reply" | "summary") {
    setBusy(true);
    try {
      await generate({ data: { ticketId, kind } });
      await load();
    } catch (aiError) {
      kobToast.error(t("support.assist.generateError"));
    } finally {
      setBusy(false);
    }
  }

  /** Human approval step: pastes the AI draft into the note box for review — never auto-sent to the customer. */
  function useAsReply(suggestion: AiSuggestion) {
    setBody(suggestion.content);
    kobToast.info(t("support.assist.insertedTitle"), t("support.assist.insertedDescription"));
  }

  return (
    <>
      <Card>
        <CardHeader title={t("support.assist.title")} description={t("support.assist.subtitle")} icon={<Bot size={16} />} />
        <CardBody>
          <div className="kob-row-actions">
            {KINDS.map((kind) => {
              const Icon = KIND_ICONS[kind.key];
              return (
                <Button key={kind.key} size="sm" variant="secondary" loading={busy} leadingIcon={<Icon size={14} />} onClick={() => void ask(kind.key)}>
                  {kind.label}
                </Button>
              );
            })}
          </div>
          <p className="kob-hint">{t("support.assist.approveHint")}</p>
          {suggestions.length ? (
            <ul className="kob-ai-list">
              {suggestions.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <b>{KINDS.find((kind) => kind.key === item.kind)?.label ?? item.kind}</b>
                  <p>{item.content}</p>
                  <div className="kob-row-actions">
                    <time>{fmtDate(item.createdAt)}</time>
                    {item.kind === "reply" && (
                      <Button size="sm" variant="ghost" onClick={() => useAsReply(item)}>
                        {t("support.assist.useReply")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("support.assist.noSuggestions")} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("support.assist.notesTitle")} icon={<NotebookPen size={16} />} />
        <CardBody>
          <Textarea
            rows={3}
            value={body}
            placeholder={t("support.assist.notePlaceholder")}
            onChange={(event) => setBody(event.target.value)}
          />
          <Button variant="primary" loading={busy} disabled={!body.trim()} onClick={() => void saveNote()}>
            {t("support.assist.saveNote")}
          </Button>
          {notes.length ? (
            <ul className="kob-note-list">
              {notes.slice(0, 6).map((note) => (
                <li key={note.id}>
                  <p>{note.body}</p>
                  <time>{fmtDate(note.createdAt)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("support.assist.notesEmpty")} />
          )}
        </CardBody>
      </Card>
    </>
  );
}
