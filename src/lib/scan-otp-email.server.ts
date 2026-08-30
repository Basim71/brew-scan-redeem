/**
 * Delivery of the /scan verification code.
 *
 * Email sending requires the project's sender domain + email infrastructure.
 * Until that is configured, sending reports `false` so the UI can tell the
 * customer that verification is temporarily unavailable (instead of pretending
 * a code was delivered).
 */

type OtpEmailInput = {
  email: string;
  code: string;
  lang: "ar" | "en";
  name: string | null;
};

function emailConfigured() {
  return Boolean(process.env["LOVABLE_EMAIL_SENDER_DOMAIN"] || process.env["SENDER_DOMAIN"]);
}

export async function sendOtpEmail(input: OtpEmailInput): Promise<boolean> {
  if (!emailConfigured()) {
    // Development convenience only: never in a deployed build.
    if (process.env["NODE_ENV"] === "development") {
      console.info(`[scan-otp] verification code for ${input.email}: ${input.code}`);
      return true;
    }
    return false;
  }

  const { renderOtpEmail } = await import("./scan-otp-email-template.server");
  const { html, subject } = renderOtpEmail(input);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("enqueue_email" as never, {
    queue_name: "transactional_emails",
    payload: {
      to: input.email,
      subject,
      html,
      purpose: "transactional",
    },
  } as never);

  if (error) {
    console.error("[scan-otp] failed to enqueue verification email", error);
    return false;
  }
  return true;
}
