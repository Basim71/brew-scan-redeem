import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, QrCode, Search, Trash2 } from "lucide-react";

import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type BranchRow,
} from "@/services/company/branches.service";
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

function qrImage(token: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl(token))}`;
}

export function BranchManagementSection({ settings, isAr, canEdit, commit }: SectionProps) {
  const d = canEdit ? undefined : true;
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ["company-branches"], queryFn: () => listBranches() });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const addBranch = () =>
    run(() =>
      createBranch({
        name_ar: isAr ? "فرع جديد" : "فرع جديد",
        name_en: "New branch",
        address_ar: null,
        address_en: null,
        phone: null,
        maps_url: null,
        logo_url: null,
        opening_time: "07:00",
        closing_time: "23:00",
        working_days: DAYS.map(([key]) => key),
        is_active: true,
      } as any),
    );

  return (
    <div className="cs-stack">
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
            <button type="button" className="cs-btn" disabled={busy} onClick={addBranch}>
              <Plus className="h-3.5 w-3.5" />
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
                isAr={isAr}
                disabled={d}
                open={openId === branch.id}
                onToggle={() => setOpenId(openId === branch.id ? null : branch.id)}
                onPatch={(patch) => run(() => updateBranch(branch.id, patch as any))}
                onDelete={() => run(() => deleteBranch(branch.id))}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function BranchCard({
  branch,
  isAr,
  disabled,
  open,
  onToggle,
  onPatch,
  onDelete,
}: {
  branch: BranchRow;
  isAr: boolean;
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<BranchRow>) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const days = branch.working_days ?? [];

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
              <img src={qrImage(branch.qr_token)} alt={isAr ? "رمز الفرع" : "Branch QR"} />
              <code>{qrUrl(branch.qr_token)}</code>
              <div className="cs-qr-actions">
                <a className="cs-ghost-btn" href={qrImage(branch.qr_token)} target="_blank" rel="noreferrer">
                  <QrCode className="h-3.5 w-3.5" />
                  {isAr ? "تحميل" : "Download"}
                </a>
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