import { useI18n } from "@/lib/i18n";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import {
  Building2,
  Clock,
  Copy,
  MapPin,
  Plus,
  QrCode,
  Store,
  Trash2,
  Users,
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
import {
  Badge,
  Button,
  Card as KobCard,
  CardBody,
  DangerDialog,
  EmptyState,
  FormDialog,
  Input,
  LoadingState,
  Modal,
  SearchInput,
  Select,
  StatusBadge,
} from "@/components/kob";
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
  const { t } = useI18n();
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
      return setDraftError(t("settings.branches.arabicAndEnglishNamesAreRequired"));
    if (draft.phone.trim() && !/^(05\d{8}|\+9665\d{8})$/.test(draft.phone.trim()))
      return setDraftError(t("settings.branches.invalidPhoneNumber"));
    if (draft.maps_url.trim() && !/^https?:\/\//.test(draft.maps_url.trim()))
      return setDraftError(t("settings.branches.invalidMapLink"));
    const code = draft.branch_code.trim().toUpperCase();
    if (code && (branches.data ?? []).some((b) => (b.branch_code ?? "").toUpperCase() === code))
      return setDraftError(t("settings.branches.branchCodeAlreadyInUse"));

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
    { icon: Store, label: t("settings.branches.totalBranches"), value: all.length },
    { icon: Building2, label: t("settings.branches.active"), value: all.filter((b) => b.is_active).length },
    { icon: Users, label: t("settings.branches.branchAssignedStaff"), value: staffPerBranch.size ? Array.from(staffPerBranch.values()).reduce((a, b) => a + b, 0) : 0 },
    {
      icon: Clock,
      label: t("settings.branches.longestHours"),
      value: all.length
        ? `${all[0]!.opening_time?.slice(0, 5)}–${all[0]!.closing_time?.slice(0, 5)}`
        : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
            <stat.icon className="h-4 w-4" />
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>

      <Card title={t("settings.branches.branchDefaults")}>
        <Row label={t("settings.branches.defaultBranch")}>
          <Select
            disabled={d}
            value={settings.default_branch_id ?? ""}
            onChange={(e) => commit({ default_branch_id: e.target.value || null }, "branches")}
          >
            <option value="">{t("settings.branches.none")}</option>
            {(branches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.name_ar : b.name_en}
              </option>
            ))}
          </Select>
        </Row>
        <Row label={t("settings.branches.branchQr")}>
          <Segmented
            disabled={d}
            value={settings.branch_qr_mode}
            onChange={(v) => commit({ branch_qr_mode: v }, "branches")}
            options={[
              { value: "per_branch" as const, label: t("settings.branches.perBranch") },
              { value: "single" as const, label: t("settings.branches.singleCode") },
            ]}
          />
        </Row>
      </Card>

      <Card
        title={t("settings.branches.branches")}
        description={
          t("settings.branches.eachBranchIsItsOwnEntity")
        }
        aside={
          canEdit ? (
            <Button
              disabled={busy}
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setDraftError(null);
                setDraft(emptyBranchDraft());
              }}
            >
              {t("settings.branches.newBranch")}
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder={t("settings.branches.searchByCodeOrName")}
          />
        </div>
        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
        {branches.isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title={t("settings.branches.noBranchesYet")}
            description={
              search.trim()
                ? t("settings.branches.noResultsMatchYourSearch")
                : t("settings.branches.addYourFirstBranchToGet")
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
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

      <FormDialog
        open={!!draft}
        onClose={() => setDraft(null)}
        title={t("settings.branches.createBranch")}
        onSubmit={submitDraft}
        busy={busy}
        submitLabel={t("common.actions.create")}
        cancelLabel={t("common.actions.cancel")}
      >
        {draft ? (
          <div className="flex flex-col gap-3">
            <Input
              label={t("settings.branches.nameArabic")}
              value={draft.name_ar}
              onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })}
            />
            <Input
              label={t("settings.branches.nameEnglish")}
              value={draft.name_en}
              onChange={(e) => setDraft({ ...draft, name_en: e.target.value })}
            />
            <Input
              label={t("settings.branches.branchCode")}
              placeholder={t("settings.branches.generatedAutomatically")}
              value={draft.branch_code}
              onChange={(e) => setDraft({ ...draft, branch_code: e.target.value })}
            />
            <Input
              label={t("settings.branches.phone")}
              placeholder="05XXXXXXXX"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <Input
              label={t("settings.branches.address")}
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
            <Input
              label={t("settings.branches.googleMapsLink")}
              placeholder="https://maps.google.com/…"
              value={draft.maps_url}
              onChange={(e) => setDraft({ ...draft, maps_url: e.target.value })}
            />
            <Input
              label={t("settings.branches.openingTime")}
              type="time"
              value={draft.opening_time}
              onChange={(e) => setDraft({ ...draft, opening_time: e.target.value })}
            />
            <Input
              label={t("settings.branches.closingTime")}
              type="time"
              value={draft.closing_time}
              onChange={(e) => setDraft({ ...draft, closing_time: e.target.value })}
            />
            <div className="col-span-full flex flex-col gap-1">
              <span>{t("settings.branches.workingDays")}</span>
              <div className="flex flex-wrap gap-2 py-2">
                {DAYS.map(([key, ar, en]) => {
                  const on = draft.working_days.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className="kob-chip"
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
            {draftError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive col-span-full">{draftError}</div> : null}
          </div>
        ) : null}
      </FormDialog>

      <Modal
        open={!!forceDelete}
        onClose={() => setForceDelete(null)}
        title={t("settings.branches.deleteBranchWithItsRecords")}
        size="sm"
        footer={
          forceDelete ? (
            <>
              <Button variant="ghost" onClick={() => setForceDelete(null)} disabled={busy}>
                {t("common.actions.cancel")}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  const target = forceDelete.branch;
                  setForceDelete(null);
                  void run(() => updateBranch(target.id, { is_active: false }));
                }}
              >
                {t("settings.branches.deactivateBranch")}
              </Button>
              <Button
                variant="danger"
                loading={busy}
                leadingIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => void removeBranch(forceDelete.branch, true)}
              >
                {t("settings.branches.deletePermanently")}
              </Button>
            </>
          ) : null
        }
      >
        {forceDelete ? (
          <p className="col-span-full">
            {isAr
              ? `الفرع "${forceDelete.branch.name_ar}" مرتبط بـ ${forceDelete.subscriptions} اشتراك و ${forceDelete.orders} طلب. الحذف سيؤدي إلى إزالة هذه السجلات نهائيًا. يمكنك بدلًا من ذلك إيقاف الفرع للحفاظ على البيانات.`
              : `Branch "${forceDelete.branch.name_en}" has ${forceDelete.subscriptions} subscriptions and ${forceDelete.orders} orders. Deleting it removes those records permanently. You can deactivate the branch instead to keep the data.`}
          </p>
        ) : null}
      </Modal>
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
  const { t } = useI18n();
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
    <article className="rounded-xl border border-border bg-card" data-open={open ? "true" : "false"}>
      <header>
        <button type="button" className="flex w-full items-center gap-3 p-3 text-start" onClick={onToggle}>
          <Badge tone="espresso">{branch.branch_code ?? "—"}</Badge>
          <span className="flex min-w-0 flex-col">
            <b>{isAr ? branch.name_ar : branch.name_en}</b>
            <small>
              {branch.opening_time?.slice(0, 5)} – {branch.closing_time?.slice(0, 5)}
            </small>
          </span>
        </button>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {staffCount}
        </span>
        <StatusBadge tone={branch.is_active ? "success" : "neutral"}>
          {branch.is_active ? (t("common.status.active")) : t("settings.branches.inactive")}
        </StatusBadge>
      </header>

      {open ? (
        <div className="grid grid-cols-1 gap-4 border-t border-border p-3 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col">
            <Row label={t("settings.branches.nameArabic")}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.name_ar}
                validate={(v) => (v.trim().length < 2 ? (t("settings.branches.nameIsRequired")) : null)}
                onCommit={(v) => onPatch({ name_ar: v.trim() })}
              />
            </Row>
            <Row label={t("settings.branches.nameEnglish")}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.name_en}
                validate={(v) => (v.trim().length < 2 ? (t("settings.branches.nameIsRequired")) : null)}
                onCommit={(v) => onPatch({ name_en: v.trim() })}
              />
            </Row>
            <Row label={t("settings.branches.phone")} hint="05XXXXXXXX">
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.phone ?? ""}
                validate={(v) =>
                  v && !/^(05\d{8}|\+9665\d{8})$/.test(v.trim()) ? (t("settings.branches.invalidPhone")) : null
                }
                onCommit={(v) => onPatch({ phone: v.trim() || null })}
              />
            </Row>
            <Row label={t("settings.branches.address")}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={(isAr ? branch.address_ar : branch.address_en) ?? ""}
                onCommit={(v) =>
                  onPatch(isAr ? { address_ar: v.trim() || null } : { address_en: v.trim() || null })
                }
              />
            </Row>
            <Row label={t("settings.branches.googleMapsLink")}>
              <TextInput
                isAr={isAr}
                disabled={disabled}
                value={branch.maps_url ?? ""}
                placeholder="https://maps.google.com/…"
                validate={(v) => (v && !/^https?:\/\//.test(v) ? (t("settings.branches.invalidUrl")) : null)}
                onCommit={(v) => onPatch({ maps_url: v.trim() || null })}
              />
            </Row>
            <Row label={t("settings.branches.openingTime")}>
              <Input
                type="time"
                disabled={disabled}
                value={branch.opening_time?.slice(0, 5) ?? "07:00"}
                onChange={(e) => onPatch({ opening_time: e.target.value })}
              />
            </Row>
            <Row label={t("settings.branches.closingTime")}>
              <Input
                type="time"
                disabled={disabled}
                value={branch.closing_time?.slice(0, 5) ?? "23:00"}
                onChange={(e) => onPatch({ closing_time: e.target.value })}
              />
            </Row>
            <Row label={t("settings.branches.workingDays")}>
              <div className="flex flex-wrap gap-2 py-2">
                {DAYS.map(([key, ar, en]) => {
                  const on = days.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className="kob-chip"
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
            <Row label={t("settings.branches.branchActive")}>
              <Toggle
                label="active"
                disabled={disabled}
                checked={branch.is_active}
                onChange={(v) => onPatch({ is_active: v })}
              />
            </Row>
            <Row label={t("settings.branches.branchLogo")}>
              <LogoUploader
                isAr={isAr}
                disabled={disabled}
                folder={`branches/${branch.id}`}
                value={branch.logo_url}
                onChange={(url) => onPatch({ logo_url: url })}
              />
            </Row>
          </div>

          <aside className="flex flex-col gap-3">
            <KobCard tone="engraved">
              <CardBody className="items-center gap-2 text-center">
                <div ref={qrWrap} className="flex justify-center rounded-lg bg-card p-2">
                  <QRCodeCanvas value={link} size={176} level="M" includeMargin bgColor="#ffffff" fgColor="#2B1A12" />
                </div>
                <code>{link}</code>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" size="sm" leadingIcon={<QrCode className="h-3.5 w-3.5" />} onClick={downloadQr}>
                    {t("settings.branches.download")}
                  </Button>
                  <Button variant="secondary" size="sm" leadingIcon={<Copy className="h-3.5 w-3.5" />} onClick={copyLink}>
                    {copied ? (t("settings.branches.copied")) : t("settings.branches.copyLink")}
                  </Button>
                  {branch.maps_url ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leadingIcon={<MapPin className="h-3.5 w-3.5" />}
                      onClick={() => window.open(branch.maps_url!, "_blank", "noreferrer")}
                    >
                      {t("settings.branches.map")}
                    </Button>
                  ) : null}
                </div>
              </CardBody>
            </KobCard>
            {!disabled ? (
              <Button variant="danger" size="sm" leadingIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirming(true)}>
                {t("settings.branches.deleteBranch")}
              </Button>
            ) : null}
          </aside>
        </div>
      ) : null}

      <DangerDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("settings.branches.deleteThisBranch")}
        confirmLabel={t("common.actions.delete")}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
      />
    </article>
  );
}
