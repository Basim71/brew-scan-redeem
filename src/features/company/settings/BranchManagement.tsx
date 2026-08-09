import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import {
  Building2,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  Search,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  BranchHasHistoryError,
  type BranchRow,
} from "@/services/company/branches.service";
import { listCompanyMembers } from "@/services/company/company-members.service";
import { Card, Row, Segmented, Toggle } from "./parts";
import { LogoUploader } from "./LogoUploader";
import { TextInput, translateError } from "./inputs";
import type { SectionProps } from "./types";

const DAYS: Array<[string, string, string]> = [
  ["sun", "الأحد", "Sun"],
  ["mon", "الاثنين", "Mon"],
  ["tue", "الثلاثاء", "Tue"],
  ["wed", "الأربعاء", "Wed"],
  ["thu", "الخميس", "Thu"],
  ["fri", "الجمعة", "Fri"],
  ["sat", "السبت", "Sat"],
];

function qrUrl(token: string) {
  const base = typeof window === "undefined" ? "" : window.location.origin;
  return `${base}/scan?b=${token}`;
}


type BranchDraft = {
  name_ar: string;
  name_en: string;
  branch_code: string;
  phone: string;
  address: string;
  maps_url: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
};

const emptyBranchDraft = (): BranchDraft => ({
  name_ar: "",
  name_en: "",
  branch_code: "",
  phone: "",
  address: "",
  maps_url: "",
  opening_time: "07:00",
  closing_time: "23:00",
  working_days: DAYS.map(([key]) => key),
});

export function BranchManagementSection({ settings, organizationId, isAr, canEdit, commit }: SectionProps) {
  const d = canEdit ? undefined : true;
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ["company-branches"], queryFn: () => listBranches() });
  const members = useQuery({
    queryKey: ["company-members", organizationId],
    queryFn: () => listCompanyMembers(organizationId),
  });
  const staffPerBranch = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of members.data ?? []) {
      if (!member.branch_id) continue;
      map.set(member.branch_id, (map.get(member.branch_id) ?? 0) + 1);
    }
    return map;
  }, [members.data]);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BranchDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forceDelete, setForceDelete] = useState<
    { branch: BranchRow; subscriptions: number; orders: number } | null
  >(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return branches.data ?? [];
    return (branches.data ?? []).filter((b) =>
      [b.branch_code, b.name_ar, b.name_en, b.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [branches.data, search]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["company-branches"] });
    } catch (err: any) {
      setError(translateError(err?.message, isAr));
    } finally {
      setBusy(false);
    }
  };

  const removeBranch = async (branch: BranchRow, force = false) => {
    setBusy(true);
    setError(null);
    try {
      await deleteBranch(branch.id, force);
      setForceDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["company-branches"] });
    } catch (err: any) {
      if (err instanceof BranchHasHistoryError) {
        setForceDelete({ branch, subscriptions: err.subscriptions, orders: err.orders });
      } else {
        setError(translateError(err?.message, isAr));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitDraft = async () => {
    if (!draft) return;
    setDraftError(null);
    if (draft.name_ar.trim().length < 2 || draft.name_en.trim().length < 2)
      return setDraftError(isAr ? "الاسم بالعربية والإنجليزية مطلوب" : "Arabic and English names are required");
    if (draft.phone.trim() && !/^(05\d{8}|\+9665\d{8})$/.test(draft.phone.trim()))
      return setDraftError(isAr ? "رقم جوال غير صحيح" : "Invalid phone number");
    if (draft.maps_url.trim() && !/^https?:\/\//.test(draft.maps_url.trim()))
      return setDraftError(isAr ? "رابط خريطة غير صحيح" : "Invalid map link");
    const code = draft.branch_code.trim().toUpperCase();
    if (code && (branches.data ?? []).some((b) => (b.branch_code ?? "").toUpperCase() === code))
      return setDraftError(isAr ? "رمز الفرع مستخدم بالفعل" : "Branch code already in use");

    try {
      await run(() =>
        createBranch({
          name_ar: draft.name_ar.trim(),
          name_en: draft.name_en.trim(),
          branch_code: code || null,
          address_ar: draft.address.trim() || null,
          address_en: draft.address.trim() || null,
          phone: draft.phone.trim() || null,
          maps_url: draft.maps_url.trim() || null,
          logo_url: null,
          opening_time: draft.opening_time,
          closing_time: draft.closing_time,
          working_days: draft.working_days,
          is_active: true,
        } as any),
      );
      setDraft(null);
    } catch (err: any) {
      setDraftError(translateError(err?.message, isAr));
    }
  };

  const all = branches.data ?? [];
  const stats = [
    { icon: Store, label: isAr ? "إجمالي الفروع" : "Total branches", value: all.length },
    { icon: Building2, label: isAr ? "فروع نشطة" : "Active", value: all.filter((b) => b.is_active).length },
    { icon: Users, label: isAr ? "موظفون مرتبطون بفروع" : "Branch-assigned staff", value: staffPerBranch.size ? Array.from(staffPerBranch.values()).reduce((a, b) => a + b, 0) : 0 },
    {
      icon: Clock,
      label: isAr ? "أطول ساعات عمل" : "Longest hours",
      value: all.length
        ? `${all[0]!.opening_time?.slice(0, 5)}–${all[0]!.closing_time?.slice(0, 5)}`
        : "—",
    },
  ];

  return (
    <div className="cs-stack">
      <div className="cs-stat-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="cs-stat">
            <stat.icon className="h-4 w-4" />
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>

      <Card title={isAr ? "إعدادات الفروع" : "Branch defaults"}>
        <Row label={isAr ? "الفرع الافتراضي" : "Default branch"}>
          <select
            className="cs-input"
            disabled={d}
            value={settings.default_branch_id ?? ""}
            onChange={(e) => commit({ default_branch_id: e.target.value || null }, "branches")}
          >
            <option value="">{isAr ? "بدون" : "None"}</option>
            {(branches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.name_ar : b.name_en}
              </option>
            ))}
          </select>
        </Row>
        <Row label={isAr ? "رمز QR" : "Branch QR"}>
          <Segmented
            disabled={d}
            value={settings.branch_qr_mode}
            onChange={(v) => commit({ branch_qr_mode: v }, "branches")}
            options={[
              { value: "per_branch" as const, label: isAr ? "رمز لكل فرع" : "Per branch" },
              { value: "single" as const, label: isAr ? "رمز موحّد" : "Single code" },
            ]}
          />
        </Row>
      </Card>

      <Card
        title={isAr ? "الفروع" : "Branches"}
        description={
          isAr
            ? "كل فرع كيان مستقل: رمز، QR، ساعات عمل، موظفون، مشروبات وخطط."
            : "Each branch is its own entity: code, QR, hours, staff, drinks and plans."
        }
        aside={
          canEdit ? (
            <button
              type="button"
              className="cs-primary-btn"
              disabled={busy}
              onClick={() => {
                setDraftError(null);
                setDraft(emptyBranchDraft());
              }}
            >
              <Plus className="h-4 w-4" />
              {isAr ? "فرع جديد" : "New branch"}
            </button>
          ) : null
        }
      >
        <div className="cs-toolbar">
          <label className="cs-search-field">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              placeholder={isAr ? "ابحث برمز أو اسم الفرع" : "Search by code or name"}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {error ? <div className="cs-error-panel">{error}</div> : null}
        {branches.isLoading ? (
          <div className="cs-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-empty">{isAr ? "لا توجد فروع." : "No branches yet."}</div>
        ) : (
          <div className="cs-branch-list">
            {rows.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                staffCount={staffPerBranch.get(branch.id) ?? 0}
                isAr={isAr}
                disabled={d}
                open={openId === branch.id}
                onToggle={() => setOpenId(openId === branch.id ? null : branch.id)}
                onPatch={(patch) => run(() => updateBranch(branch.id, patch as any))}
                onDelete={() => void removeBranch(branch)}
              />
            ))}
          </div>
        )}
      </Card>

      {draft ? (
        <div className="cs-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cs-modal">
            <header>
              <h3>{isAr ? "إنشاء فرع" : "Create branch"}</h3>
              <button type="button" className="cs-icon-btn" onClick={() => setDraft(null)} aria-label="close">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="cs-modal-body">
              <label className="cs-field">
                <span>{isAr ? "الاسم بالعربية" : "Name (Arabic)"}</span>
                <input className="cs-input" value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} />
              </label>
              <label className="cs-field">
                <span>{isAr ? "الاسم بالإنجليزية" : "Name (English)"}</span>
                <input className="cs-input" value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
              </label>
              <label className="cs-field">
                <span>{isAr ? "رمز الفرع" : "Branch code"}</span>
                <input
                  className="cs-input"
                  placeholder={isAr ? "يُولَّد تلقائيًا" : "Generated automatically"}
                  value={draft.branch_code}
                  onChange={(e) => setDraft({ ...draft, branch_code: e.target.value })}
                />
              </label>
              <label className="cs-field">
                <span>{isAr ? "رقم التواصل" : "Phone"}</span>
                <input className="cs-input" placeholder="05XXXXXXXX" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </label>
              <label className="cs-field cs-field-wide">
                <span>{isAr ? "العنوان" : "Address"}</span>
                <input className="cs-input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </label>
              <label className="cs-field cs-field-wide">
                <span>{isAr ? "رابط الخريطة" : "Google Maps link"}</span>
                <input className="cs-input" placeholder="https://maps.google.com/…" value={draft.maps_url} onChange={(e) => setDraft({ ...draft, maps_url: e.target.value })} />
              </label>
              <label className="cs-field">
                <span>{isAr ? "وقت الافتتاح" : "Opening time"}</span>
                <input className="cs-input" type="time" value={draft.opening_time} onChange={(e) => setDraft({ ...draft, opening_time: e.target.value })} />
              </label>
              <label className="cs-field">
                <span>{isAr ? "وقت الإغلاق" : "Closing time"}</span>
                <input className="cs-input" type="time" value={draft.closing_time} onChange={(e) => setDraft({ ...draft, closing_time: e.target.value })} />
              </label>
              <div className="cs-field cs-field-wide">
                <span>{isAr ? "أيام العمل" : "Working days"}</span>
                <div className="cs-chips">
                  {DAYS.map(([key, ar, en]) => {
                    const on = draft.working_days.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className="cs-chip"
                        data-on={on ? "true" : "false"}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            working_days: on
                              ? draft.working_days.filter((day) => day !== key)
                              : [...draft.working_days, key],
                          })
                        }
                      >
                        {isAr ? ar : en}
                      </button>
                    );
                  })}
                </div>
              </div>
              {draftError ? <div className="cs-error-panel cs-field-wide">{draftError}</div> : null}
            </div>
            <footer>
              <button type="button" className="cs-ghost-btn" onClick={() => setDraft(null)}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button type="button" className="cs-primary-btn" disabled={busy} onClick={submitDraft}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isAr ? "إنشاء" : "Create"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BranchCard({
  branch,
  staffCount,
  isAr,
  disabled,
  open,
  onToggle,
  onPatch,
  onDelete,
}: {
  branch: BranchRow;
  staffCount: number;
  isAr: boolean;
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<BranchRow>) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrWrap = useRef<HTMLDivElement>(null);
  const days = branch.working_days ?? [];
  const link = qrUrl(branch.qr_token);

  const downloadQr = () => {
    const canvas = qrWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `kob-branch-${branch.branch_code ?? branch.id.slice(0, 8)}.png`;
    anchor.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <article className="cs-branch" data-open={open ? "true" : "false"}>
      <header>
        <button type="button" className="cs-branch-head" onClick={onToggle}>
          <span className="cs-branch-code">{branch.branch_code ?? "—"}</span>
          <span className="cs-branch-name">
            <b>{isAr ? branch.name_ar : branch.name_en}</b>
            <small>
              {branch.opening_time?.slice(0, 5)} – {branch.closing_time?.slice(0, 5)}
            </small>
          </span>
        </button>
        <span className="cs-branch-staff">
          <Users className="h-3.5 w-3.5" />
          {staffCount}
        </span>
        <span className="cs-branch-state" data-on={branch.is_active ? "true" : "false"}>
          {branch.is_active ? (isAr ? "نشط" : "Active") : isAr ? "موقوف" : "Inactive"}
        </span>
      </header>

      {open ? (
        <div className="cs-branch-body">
          <div className="cs-branch-main">
            <Row label={isAr ? "الاسم بالعربية" : "Name (Arabic)"}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.name_ar}
                validate={(v) => (v.trim().length < 2 ? (isAr ? "الاسم مطلوب" : "Name is required") : null)}
                onCommit={(v) => onPatch({ name_ar: v.trim() })}
              />
            </Row>
            <Row label={isAr ? "الاسم بالإنجليزية" : "Name (English)"}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.name_en}
                validate={(v) => (v.trim().length < 2 ? (isAr ? "الاسم مطلوب" : "Name is required") : null)}
                onCommit={(v) => onPatch({ name_en: v.trim() })}
              />
            </Row>
            <Row label={isAr ? "رقم التواصل" : "Phone"} hint="05XXXXXXXX">
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.phone ?? ""}
                validate={(v) =>
                  v && !/^(05\d{8}|\+9665\d{8})$/.test(v.trim()) ? (isAr ? "رقم غير صحيح" : "Invalid phone") : null
                }
                onCommit={(v) => onPatch({ phone: v.trim() || null })}
              />
            </Row>
            <Row label={isAr ? "العنوان" : "Address"}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={(isAr ? branch.address_ar : branch.address_en) ?? ""}
                onCommit={(v) =>
                  onPatch(isAr ? { address_ar: v.trim() || null } : { address_en: v.trim() || null })
                }
              />
            </Row>
            <Row label={isAr ? "رابط الخريطة" : "Google Maps link"}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.maps_url ?? ""}
                placeholder="https://maps.google.com/…"
                validate={(v) => (v && !/^https?:\/\//.test(v) ? (isAr ? "رابط غير صحيح" : "Invalid URL") : null)}
                onCommit={(v) => onPatch({ maps_url: v.trim() || null })}
              />
            </Row>
            <Row label={isAr ? "وقت الافتتاح" : "Opening time"}>
              <input
                className="cs-input"
                type="time"
                disabled={disabled}
                value={branch.opening_time?.slice(0, 5) ?? "07:00"}
                onChange={(e) => onPatch({ opening_time: e.target.value })}
              />
            </Row>
            <Row label={isAr ? "وقت الإغلاق" : "Closing time"}>
              <input
                className="cs-input"
                type="time"
                disabled={disabled}
                value={branch.closing_time?.slice(0, 5) ?? "23:00"}
                onChange={(e) => onPatch({ closing_time: e.target.value })}
              />
            </Row>
            <Row label={isAr ? "أيام العمل" : "Working days"}>
              <div className="cs-chips">
                {DAYS.map(([key, ar, en]) => {
                  const on = days.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className="cs-chip"
                      data-on={on ? "true" : "false"}
                      disabled={disabled}
                      onClick={() =>
                        onPatch({
                          working_days: on ? days.filter((day) => day !== key) : [...days, key],
                        })
                      }
                    >
                      {isAr ? ar : en}
                    </button>
                  );
                })}
              </div>
            </Row>
            <Row label={isAr ? "الفرع نشط" : "Branch active"}>
              <Toggle
                label="active"
                disabled={disabled}
                checked={branch.is_active}
                onChange={(v) => onPatch({ is_active: v })}
              />
            </Row>
            <Row label={isAr ? "شعار الفرع" : "Branch logo"}>
              <LogoUploader
                isAr={isAr}
                disabled={disabled}
                folder={`branches/${branch.id}`}
                value={branch.logo_url}
                onChange={(url) => onPatch({ logo_url: url })}
              />
            </Row>
          </div>

          <aside className="cs-branch-side">
            <div className="cs-qr">
              <div ref={qrWrap} className="cs-qr-canvas">
                <QRCodeCanvas value={link} size={176} level="M" includeMargin bgColor="#ffffff" fgColor="#2B1A12" />
              </div>
              <code>{link}</code>
              <div className="cs-qr-actions">
                <button type="button" className="cs-ghost-btn" onClick={downloadQr}>
                  <QrCode className="h-3.5 w-3.5" />
                  {isAr ? "تحميل" : "Download"}
                </button>
                <button type="button" className="cs-ghost-btn" onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ الرابط" : "Copy link"}
                </button>
                {branch.maps_url ? (
                  <a className="cs-ghost-btn" href={branch.maps_url} target="_blank" rel="noreferrer">
                    <MapPin className="h-3.5 w-3.5" />
                    {isAr ? "الخريطة" : "Map"}
                  </a>
                ) : null}
              </div>
            </div>
            {!disabled ? (
              confirming ? (
                <div className="cs-danger-confirm">
                  <span>{isAr ? "تأكيد حذف الفرع؟" : "Delete this branch?"}</span>
                  <button type="button" className="cs-danger-btn" onClick={onDelete}>
                    {isAr ? "حذف" : "Delete"}
                  </button>
                  <button type="button" className="cs-ghost-btn" onClick={() => setConfirming(false)}>
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              ) : (
                <button type="button" className="cs-ghost-btn" onClick={() => setConfirming(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {isAr ? "حذف الفرع" : "Delete branch"}
                </button>
              )
            ) : null}
          </aside>
        </div>
      ) : null}
    </article>
  );
}