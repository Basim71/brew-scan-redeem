import { toast } from "sonner";

/**
 * Unified KOB toast API. Always pass already-localized strings
 * (call t("...") at the call site) — never hardcode copy here.
 */
export const kobToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description, className: "kob-toast", duration: 4000 }),
  error: (message: string, description?: string) =>
    toast.error(message, { description, className: "kob-toast", duration: 6000 }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description, className: "kob-toast", duration: 5000 }),
  info: (message: string, description?: string) =>
    toast.info(message, { description, className: "kob-toast", duration: 4000 }),
  loading: (message: string) => toast.loading(message, { className: "kob-toast" }),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
