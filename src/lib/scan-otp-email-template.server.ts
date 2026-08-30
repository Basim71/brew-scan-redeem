/** Branded HTML for the /scan verification code email. */

type Input = {
  code: string;
  lang: "ar" | "en";
  name: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderOtpEmail({ code, lang, name }: Input) {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const greeting = name ? (isAr ? `مرحبًا ${name}،` : `Hi ${name},`) : isAr ? "مرحبًا،" : "Hi there,";
  const subject = isAr ? `رمز التحقق: ${code}` : `Your verification code: ${code}`;
  const intro = isAr
    ? "استخدم الرمز التالي لتأكيد رقم جوالك والدخول إلى اشتراكك."
    : "Use the code below to confirm your phone number and open your subscription.";
  const expiry = isAr ? "الرمز صالح لمدة 10 دقائق." : "This code expires in 10 minutes.";
  const warning = isAr
    ? "لا تشارك هذا الرمز مع أي شخص. إذا لم تطلبه، تجاهل هذه الرسالة."
    : "Never share this code with anyone. If you didn't request it, ignore this email.";

  const html = `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
  <head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#2b1b12;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;font-size:20px;font-weight:700;letter-spacing:2px;color:#b8823c;">KOB</div>
      <div style="margin-top:24px;border:1px solid #eee1d2;border-radius:16px;padding:28px 24px;">
        <p style="margin:0 0 12px;font-size:15px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#5b4636;">${escapeHtml(intro)}</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;padding:14px 26px;border-radius:12px;background:#2b1b12;color:#f4c77b;font-size:30px;letter-spacing:10px;font-weight:700;direction:ltr;">${escapeHtml(code)}</span>
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#5b4636;">${escapeHtml(expiry)}</p>
        <p style="margin:0;font-size:12px;color:#8a7565;">${escapeHtml(warning)}</p>
      </div>
    </div>
  </body>
</html>`;

  return { html, subject };
}
