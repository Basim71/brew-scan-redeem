/**
 * Delivery of the /scan verification code through Lovable's managed email API.
 */

type OtpEmailInput = {
  email: string;
  code: string;
  lang: "ar" | "en";
  name: string | null;
};

export async function sendOtpEmail(input: OtpEmailInput): Promise<boolean> {
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("scan-otp", input.email, {
      templateData: { code: input.code, lang: input.lang, name: input.name },
    });
    return result.sent;
  } catch (error) {
    console.error("[scan-otp] failed to send verification email", error);
    return false;
  }
}
