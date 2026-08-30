import { createServerFn } from "@tanstack/react-start";

export const requestScanOtp = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      phone: string;
      branchId: string | null;
      email?: string | null;
      deviceToken?: string | null;
      lang: "ar" | "en";
    }) => input,
  )
  .handler(async ({ data }) => {
    const { requestOtp } = await import("./scan-otp.server");
    return requestOtp(data);
  });

export const verifyScanOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; branchId: string | null; code: string }) => input)
  .handler(async ({ data }) => {
    const { verifyOtp } = await import("./scan-otp.server");
    return verifyOtp(data);
  });
