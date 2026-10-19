import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown, field: string, max = 160, required = true): string {
  const raw = typeof v === "string" ? v.trim() : "";
  if (!raw && required) throw new Error(`missing_${field}`);
  if (raw.length > max) throw new Error(`too_long_${field}`);
  return raw;
}

function genPassword(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return `Kob-${Array.from(b, (x) => a[x % a.length]).join("")}`;
}

export const createCompanyWithManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: Record<string, unknown>) => {
    const email = str(i.managerEmail, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("invalid_email");
    const code = str(i.code, "code", 20).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (code.length < 3) throw new Error("invalid_code");
    const password = str(i.password, "password", 72, false);
    if (password && password.length < 8) throw new Error("weak_password");
    return {
      nameAr: str(i.nameAr, "name_ar", 120),
      nameEn: str(i.nameEn, "name_en", 120, false) || null,
      code,
      phone: str(i.phone, "phone", 20, false) || null,
      managerName: str(i.managerName, "manager_name", 120),
      managerEmail: email,
      password: password || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: allowed } = await (context.supabase as any).rpc("is_platform_user", {
      required_roles: ["platform_owner", "platform_admin"],
    });
    if (!allowed) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const password = data.password ?? genPassword();

    const { data: dup } = await admin.from("organizations").select("id").eq("organization_code", data.code).maybeSingle();
    if (dup) throw new Error("code_taken");

    // Manager account
    let userId: string | null = null;
    let createdUser = false;
    const created = await admin.auth.admin.createUser({
      email: data.managerEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.managerName },
    });
    if (created.error) {
      if (!/already|registered|exists/i.test(created.error.message ?? "")) throw new Error(created.error.message);
      const { data: p } = await admin.from("profiles").select("id").eq("email", data.managerEmail).maybeSingle();
      if (!p?.id) throw new Error("email_taken");
      userId = p.id;
    } else {
      userId = created.data.user?.id ?? null;
      createdUser = true;
    }
    if (!userId) throw new Error("could_not_create_account");

    const slug = `${data.code.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name_ar: data.nameAr,
        name_en: data.nameEn,
        organization_code: data.code,
        organization_type: "company",
        slug,
        phone: data.phone,
        email: data.managerEmail,
        owner_user_id: userId,
        status: "active",
      })
      .select("id")
      .single();
    if (orgErr) {
      if (createdUser) await admin.auth.admin.deleteUser(userId);
      throw new Error(orgErr.message);
    }

    await admin.from("profiles").upsert({ id: userId, full_name: data.managerName, email: data.managerEmail }, { onConflict: "id" });

    const { error: memErr } = await admin.from("organization_members").insert({
      organization_id: org.id,
      user_id: userId,
      role: "owner",
      status: "active",
      invited_by: context.userId,
      invited_at: new Date().toISOString(),
    });
    if (memErr) throw new Error(memErr.message);

    await admin.from("branches").insert({
      organization_id: org.id,
      name_ar: "الفرع الرئيسي",
      name_en: "Main Branch",
      is_active: true,
    });

    return {
      organizationId: org.id as string,
      email: data.managerEmail,
      password: createdUser ? password : null,
    };
  });
