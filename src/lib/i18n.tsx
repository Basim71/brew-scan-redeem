import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

const STORAGE_KEY = "kob.lang";

/* ---------------- Dictionary ---------------- */
const dict = {
  en: {
    // brand / common
    brand_tag: "Coffee Coupon Co.",
    staff_login: "Staff Login",
    scan_branch: "Scan a Branch",
    back: "Back",
    signOut: "Sign out",
    signIn: "Sign In",
    createAccount: "Create Account",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    welcomeBack: "Welcome back",
    createAccountHeading: "Create account",
    signInSubtitle: "Sign in to your KOB staff dashboard.",
    signUpSubtitle: "New admin or cashier account.",
    newHere: "New here? Create an account",
    haveAccount: "Already have an account? Sign in",
    customersHint: "Customers don't need an account — go to scan.",
    goToScan: "go to scan",

    // landing
    heroBadge: "Premium Subscription System",
    heroTitleA: "A daily cup,",
    heroTitleB: "served on subscription.",
    heroBody: "KOB lets specialty coffee shops sell daily coffee coupons tied to a phone number. Customers scan, choose their brew, and the cashier approves — no plastic cards, no fuss.",
    tryCustomer: "Try the Customer Flow",
    staffDashboard: "Staff Dashboard",
    todaysCoupon: "Today's Coupon",
    remainingDays: "{n} / {total} days",
    feat1_t: "Scan the branch code", feat1_b: "Customers tap in without accounts — just their phone number.",
    feat2_t: "Pick today's brew",     feat2_b: "Every subscription drink is one tap away, in Arabic or English.",
    feat3_t: "Cashier approves",       feat3_b: "The barista confirms and the day is marked used — instantly.",
    footer: "KOB · Est. 2026 · Brewed with care",

    // admin
    admin_title: "KOB · Admin",
    admin_sub: "Control Panel",
    tab_overview: "Dashboard",
    tab_subs: "Coupons",
    tab_branches: "Branches",
    tab_staff: "Cashiers",
    tab_plans: "Plans",
    tab_customers: "Customers",
    tab_reports: "Reports",
    tab_qr: "QR codes",

    stat_subs: "Active Subscriptions",
    stat_branches: "Branches",
    stat_pending: "Pending Orders",
    stat_approved: "Approved Today+",
    recent_activity: "Recent Activity",
    col_coffee: "Coffee",
    col_branch: "Branch",
    col_status: "Status",
    col_when: "When",
    col_phone: "Phone",
    col_customer: "Customer",
    col_plan: "Plan",
    col_used: "Used",
    col_total: "Total",
    col_user_id: "User ID",
    col_role: "Role",

    empty_orders: "No orders yet.",
    empty_subs: "No subscriptions yet.",
    empty_roles: "No roles assigned yet.",
    empty_branches: "No branches yet.",
    empty_queue: "All caught up. The queue is empty.",
    empty_days: "No days remaining.",

    new_sub: "New Subscription",
    all_subs: "All Subscriptions",
    new_branch: "New branch",
    new_plan: "New plan",
    new_cashier: "New cashier",
    create_batch: "Create batch",
    assign_role: "Assign Role",
    assign_hint: "The user must first sign up. Copy their user ID from the backend Users panel.",
    staff_members: "Staff Members",
    open_scan_link: "Open Scan Link",

    f_phone: "Phone", f_customer: "Customer", f_plan: "Plan", f_days: "Days",
    f_name: "Name", f_code: "Code", f_address: "Address",
    f_user_id: "User ID (UUID)", f_role: "Role", f_branch: "Branch (cashier)",

    btn_create: "Create",
    btn_assign: "Assign",
    btn_save: "Save",
    btn_cancel: "Cancel",
    btn_edit: "Edit",
    btn_delete: "Delete",
    btn_download: "Download",
    btn_print: "Print",
    btn_sell: "Sell",
    btn_approve: "Approve",
    btn_reject: "Reject",

    role_cashier: "Cashier",
    role_admin: "Admin",

    // cashier
    cashier_title: "KOB · Cashier",
    no_branch_h: "No branch assigned",
    no_branch_b: "Ask an admin to assign your account to a branch.",
    pending_orders: "Pending Orders",
    recent: "Recent",
    of_left: "{left}/{total} left",

    // status
    st_pending: "Pending",
    st_approved: "Approved",
    st_rejected: "Rejected",
    st_active: "Active",
    st_inactive: "Inactive",
    st_available: "Available",
    st_sold: "Sold",
    st_expired: "Expired",
    st_used: "Used",
    st_upcoming: "Upcoming",
    st_admin: "Admin",
    st_cashier: "Cashier",

    // scan
    pickBranch: "Choose a branch",
    scanHint: "Scan a KOB branch QR code — or pick one below.",
    pickLang: "Choose language / اختر اللغة",
    enterPhone: "Enter your phone",
    phonePlaceholder: "+1 555 123 4567",
    lookup: "Look up my subscription",
    tagline: "Your daily cup, on subscription.",
    demoHint: "Try demo: +1000000000",
    noSub: "No active subscription found for this number.",
    planLabel: "Plan",
    branchLabel: "Branch",
    remainingLabel: "Remaining",
    pickCoffee: "Pick today's coffee",
    waiting: "Waiting for the cashier",
    waitingHint: "Show this screen to the cashier.",
    approvedMsg: "Approved! Enjoy your coffee.",
    rejectedMsg: "Order rejected.",
    newOrder: "New order",

    // time
    ago_s: "{n}s ago", ago_m: "{n}m ago", ago_h: "{n}h ago", ago_d: "{n}d ago",
  },
  ar: {
    brand_tag: "شركة كوبونات القهوة",
    staff_login: "دخول الموظفين",
    scan_branch: "امسح فرعاً",
    back: "رجوع",
    signOut: "تسجيل الخروج",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    welcomeBack: "مرحباً بعودتك",
    createAccountHeading: "إنشاء حساب",
    signInSubtitle: "سجّل الدخول إلى لوحة موظفي KOB.",
    signUpSubtitle: "حساب مسؤول أو كاشير جديد.",
    newHere: "جديد هنا؟ أنشئ حساباً",
    haveAccount: "لديك حساب؟ سجّل الدخول",
    customersHint: "لا يحتاج العملاء إلى حساب — انتقل إلى المسح.",
    goToScan: "انتقل إلى المسح",

    heroBadge: "نظام اشتراك متميز",
    heroTitleA: "قهوتك اليومية،",
    heroTitleB: "باشتراك مريح.",
    heroBody: "يتيح KOB لمقاهي القهوة المختصة بيع كوبونات قهوة يومية مرتبطة برقم الهاتف. يمسح العميل، يختار مشروبه، ويوافق الكاشير — بدون بطاقات ولا تعقيد.",
    tryCustomer: "جرّب تجربة العميل",
    staffDashboard: "لوحة الموظفين",
    todaysCoupon: "كوبون اليوم",
    remainingDays: "{n} / {total} يوم",
    feat1_t: "امسح رمز الفرع",     feat1_b: "يدخل العميل بدون حساب — فقط رقم الهاتف.",
    feat2_t: "اختر قهوة اليوم",     feat2_b: "كل مشروب اشتراك على بُعد نقرة، بالعربية أو الإنجليزية.",
    feat3_t: "الكاشير يوافق",       feat3_b: "يؤكّد الباريستا ويُحتسب اليوم فوراً.",
    footer: "KOB · تأسست ٢٠٢٦ · تُقدَّم بعناية",

    admin_title: "KOB · لوحة التحكم",
    admin_sub: "لوحة التحكم",
    tab_overview: "لوحة التحكم",
    tab_subs: "الكوبونات",
    tab_branches: "الفروع",
    tab_staff: "الكاشير",
    tab_plans: "الخطط",
    tab_customers: "العملاء",
    tab_reports: "التقارير",
    tab_qr: "رموز QR",

    stat_subs: "الاشتراكات النشطة",
    stat_branches: "الفروع",
    stat_pending: "الطلبات قيد الانتظار",
    stat_approved: "الموافق عليها",
    recent_activity: "النشاط الأخير",
    col_coffee: "القهوة",
    col_branch: "الفرع",
    col_status: "الحالة",
    col_when: "الوقت",
    col_phone: "الهاتف",
    col_customer: "العميل",
    col_plan: "الخطة",
    col_used: "المستخدم",
    col_total: "الإجمالي",
    col_user_id: "معرّف المستخدم",
    col_role: "الدور",

    empty_orders: "لا توجد طلبات بعد.",
    empty_subs: "لا توجد اشتراكات بعد.",
    empty_roles: "لم يتم تعيين أدوار بعد.",
    empty_branches: "لا توجد فروع بعد.",
    empty_queue: "لا توجد طلبات في الانتظار.",
    empty_days: "لا توجد أيام متبقية.",

    new_sub: "اشتراك جديد",
    all_subs: "جميع الاشتراكات",
    new_branch: "فرع جديد",
    new_plan: "خطة جديدة",
    new_cashier: "كاشير جديد",
    create_batch: "إنشاء دفعة كوبونات",
    assign_role: "تعيين دور",
    assign_hint: "يجب على المستخدم التسجيل أولاً. انسخ معرّفه من لوحة المستخدمين في الخلفية.",
    staff_members: "الموظفون",
    open_scan_link: "فتح رابط المسح",

    f_phone: "الهاتف", f_customer: "العميل", f_plan: "الخطة", f_days: "الأيام",
    f_name: "الاسم", f_code: "الرمز", f_address: "العنوان",
    f_user_id: "معرّف المستخدم (UUID)", f_role: "الدور", f_branch: "الفرع (للكاشير)",

    btn_create: "إنشاء",
    btn_assign: "تعيين",
    btn_save: "حفظ",
    btn_cancel: "إلغاء",
    btn_edit: "تعديل",
    btn_delete: "حذف",
    btn_download: "تحميل",
    btn_print: "طباعة",
    btn_sell: "بيع",
    btn_approve: "موافقة",
    btn_reject: "رفض",

    role_cashier: "كاشير",
    role_admin: "مسؤول",

    cashier_title: "KOB · الكاشير",
    no_branch_h: "لم يتم تعيين فرع",
    no_branch_b: "اطلب من المسؤول تعيين حسابك على فرع.",
    pending_orders: "الطلبات قيد الانتظار",
    recent: "الأخيرة",
    of_left: "{left}/{total} متبقٍ",

    st_pending: "قيد الانتظار",
    st_approved: "تمت الموافقة",
    st_rejected: "مرفوض",
    st_active: "نشط",
    st_inactive: "غير نشط",
    st_available: "متاح",
    st_sold: "مباع",
    st_expired: "منتهي",
    st_used: "مستخدم",
    st_upcoming: "قادم",
    st_admin: "مسؤول",
    st_cashier: "كاشير",

    pickBranch: "اختر الفرع",
    scanHint: "امسح رمز QR للفرع — أو اختر أدناه.",
    pickLang: "اختر اللغة / Choose language",
    enterPhone: "أدخل رقم هاتفك",
    phonePlaceholder: "٠٥٠ ١٢٣ ٤٥٦٧",
    lookup: "بحث عن اشتراكي",
    tagline: "قهوتك اليومية باشتراك.",
    demoHint: "تجربة: +1000000000",
    noSub: "لا يوجد اشتراك نشط لهذا الرقم.",
    planLabel: "الخطة",
    branchLabel: "الفرع",
    remainingLabel: "المتبقي",
    pickCoffee: "اختر قهوة اليوم",
    waiting: "بانتظار موافقة الكاشير",
    waitingHint: "أظهر هذه الشاشة للكاشير.",
    approvedMsg: "تمت الموافقة! استمتع بقهوتك.",
    rejectedMsg: "تم رفض الطلب.",
    newOrder: "طلب جديد",

    ago_s: "قبل {n} ث", ago_m: "قبل {n} د", ago_h: "قبل {n} س", ago_d: "قبل {n} ي",
  },
} as const;

export type TKey = keyof typeof dict.en;

/* ---------------- Context ---------------- */
type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (k: TKey, vars?: Record<string, string | number>) => string;
  fmtNum: (n: number) => string;
  fmtDate: (d: string | Date) => string;
  timeAgo: (iso: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function getInitial(): Lang {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "ar" || v === "en" ? v : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setLangState(getInitial());
  }, []);

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "en" ? "ar" : "en");
  }, [lang, setLang]);

  const value = useMemo<Ctx>(() => {
    const nf = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US");
    const df = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" });
    const t = (k: TKey, vars?: Record<string, string | number>) => {
      let s: string = (dict[lang] as any)[k] ?? (dict.en as any)[k] ?? k;
      if (vars) for (const [key, v] of Object.entries(vars)) s = s.replaceAll(`{${key}}`, String(v));
      return s;
    };
    const fmtNum = (n: number) => nf.format(n);
    const fmtDate = (d: string | Date) => df.format(new Date(d));
    const timeAgo = (iso: string) => {
      const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 60) return t("ago_s", { n: fmtNum(s) });
      if (s < 3600) return t("ago_m", { n: fmtNum(Math.round(s / 60)) });
      if (s < 86400) return t("ago_h", { n: fmtNum(Math.round(s / 3600)) });
      return t("ago_d", { n: fmtNum(Math.round(s / 86400)) });
    };
    return { lang, dir, setLang, toggle, t, fmtNum, fmtDate, timeAgo };
  }, [lang, dir, setLang, toggle]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used inside LanguageProvider");
  return c;
}

/* ---------------- Switcher ---------------- */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={"engraved inline-flex items-center text-xs font-semibold overflow-hidden " + className}>
      <button
        onClick={() => setLang("ar")}
        className={"px-3 py-1.5 transition " + (lang === "ar" ? "gold-text" : "text-cream-dim hover:text-caramel-bright")}
        aria-pressed={lang === "ar"}
      >
        العربية
      </button>
      <span className="text-cream-dim opacity-40">|</span>
      <button
        onClick={() => setLang("en")}
        className={"px-3 py-1.5 transition " + (lang === "en" ? "gold-text" : "text-cream-dim hover:text-caramel-bright")}
        aria-pressed={lang === "en"}
      >
        English
      </button>
    </div>
  );
}