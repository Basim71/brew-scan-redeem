import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SuggestionKind = "triage" | "reply" | "summary";

/**
 * Generates an AI suggestion for a support ticket (triage, reply draft or summary)
 * and stores it in ai_suggestions. Runs server-side through the Lovable AI gateway.
 */
export const generateTicketSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string; kind: SuggestionKind }) => {
    if (!input?.ticketId) throw new Error("ticketId is required");
    const kind = input.kind ?? "triage";
    if (!["triage", "reply", "summary"].includes(kind)) throw new Error("invalid kind");
    return { ticketId: input.ticketId, kind: kind as SuggestionKind };
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI gateway is not configured");

    const supabase = context.supabase as any;

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, description, category, priority, status, context")
      .eq("id", data.ticketId)
      .single();
    if (ticketError) throw new Error(ticketError.message);

    const { data: messages } = await supabase
      .from("ticket_messages")
      .select("sender_kind, body, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true })
      .limit(40);

    const transcript = (messages ?? [])
      .map((row: any) => `${row.sender_kind}: ${row.body}`)
      .join("\n");

    const instructions: Record<SuggestionKind, string> = {
      triage:
        "صنّف التذكرة: اقترح التصنيف والأولوية المناسبة، والخطوات الأولى لفريق الدعم. أجب بنقاط قصيرة.",
      reply: "اكتب مسودة رد مهني وودّي بالعربية موجّه للشركة، لا يزيد عن 6 أسطر.",
      summary: "لخّص التذكرة والمحادثة في 4 نقاط، ثم اذكر الحالة الحالية والخطوة التالية.",
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد فريق الدعم الفني في منصة KOB لإدارة اشتراكات القهوة. أجب بالعربية فقط، بإيجاز ودقة تشغيلية.",
          },
          {
            role: "user",
            content: `${instructions[data.kind]}

رقم التذكرة: ${ticket.ticket_number}
العنوان: ${ticket.subject}
الوصف: ${ticket.description}
التصنيف الحالي: ${ticket.category}
الأولوية الحالية: ${ticket.priority}
الحالة: ${ticket.status}
سياق تقني: ${JSON.stringify(ticket.context ?? {})}

المحادثة:
${transcript || "لا توجد رسائل بعد."}`,
          },
        ],
      }),
    });

    if (response.status === 429) throw new Error("تم تجاوز حد الاستخدام، جرّب بعد قليل.");
    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("لم يتم توليد اقتراح");

    const { error: insertError } = await supabase.from("ai_suggestions").insert({
      ticket_id: data.ticketId,
      kind: data.kind,
      audience: "agent",
      content,
      status: "pending",
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      created_by: context.userId,
    });
    if (insertError) throw new Error(insertError.message);

    return { content };
  });
