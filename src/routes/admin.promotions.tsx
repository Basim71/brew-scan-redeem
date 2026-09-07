import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Toggle,
  kobToast,
} from "@/components/kob";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import {
  createPromotion,
  deletePromotion,
  listOrganizationBranches,
  listPromotions,
  updatePromotion,
  type PromotionInput,
  type PromotionRow,
  type ScanBranchOption,
} from "@/services/company/promotions.service";
import { LogoUploader } from "@/features/company/settings/LogoUploader";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({
    meta: [
      { title: "Scan Promotions — KOB" },
      { name: "description", content: "Publish company promotions and offers on the customer scan page." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromotionsPage,
});

const EMPTY: PromotionInput = {
  branch_id: null,
  title_ar: "",
  title_en: "",
  body_ar: "",
  body_en: "",
  image_url: "",
  cta_label_ar: "",
  cta_label_en: "",
  cta_url: "",
  is_active: true,
  sort_order: 0,
  starts_at: null,
  ends_at: null,
};

function toInput(row: PromotionRow): PromotionInput {
  return {
    branch_id: row.branch_id,
    title_ar: row.title_ar,
    title_en: row.title_en,
    body_ar: row.body_ar ?? "",
    body_en: row.body_en ?? "",
    image_url: row.image_url ?? "",
    cta_label_ar: row.cta_label_ar ?? "",
    cta_label_en: row.cta_label_en ?? "",
    cta_url: row.cta_url ?? "",
    is_active: row.is_active,
    sort_order: row.sort_order,
    starts_at: row.starts_at ? row.starts_at.slice(0, 10) : null,
    ends_at: row.ends_at ? row.ends_at.slice(0, 10) : null,
  };
}

function PromotionsPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { organization } = useOrganization();
  const orgId = organization?.id ?? null;

  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [branches, setBranches] = useState<ScanBranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; draft: PromotionInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PromotionRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [promos, branchList] = await Promise.all([
        listPromotions(orgId),
        listOrganizationBranches(orgId),
      ]);
      setRows(promos);
      setBranches(branchList);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, isAr ? b.name_ar : b.name_en]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : isAr ? "كل الفروع" : "All branches");
  }, [branches, isAr]);

  async function save() {
    if (!editing || !orgId) return;
    const draft = editing.draft;
    if (!draft.image_url?.trim()) {
      kobToast.error(isAr ? "أضف صورة الدعاية." : "Add the promotion image.");
      return;
    }

    setSaving(true);
    try {
      const payload: PromotionInput = {
        ...draft,
        body_ar: draft.body_ar?.trim() || null,
        body_en: draft.body_en?.trim() || null,
        image_url: draft.image_url?.trim() || null,
        cta_label_ar: draft.cta_label_ar?.trim() || null,
        cta_label_en: draft.cta_label_en?.trim() || null,
        cta_url: draft.cta_url?.trim() || null,
        starts_at: draft.starts_at || null,
        ends_at: draft.ends_at || null,
      };
      if (editing.id) await updatePromotion(editing.id, payload);
      else await createPromotion(orgId, payload);
      kobToast.success(isAr ? "تم الحفظ." : "Saved.");
      setEditing(null);
      await load();
    } catch (saveError) {
      kobToast.error(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: PromotionRow) {
    try {
      await updatePromotion(row.id, { is_active: !row.is_active });
      await load();
    } catch (toggleError) {
      kobToast.error(toggleError instanceof Error ? toggleError.message : "Update failed.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deletePromotion(pendingDelete.id);
      kobToast.success(isAr ? "تم الحذف." : "Deleted.");
      setPendingDelete(null);
      await load();
    } catch (deleteError) {
      kobToast.error(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    }
  }

  const patch = (part: Partial<PromotionInput>) =>
    setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...part } } : current));

  return (
    <div className="kob-stack" dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        eyebrow={isAr ? "صفحة العميل" : "Customer scan"}
        title={isAr ? "الدعايات والعروض" : "Promotions & Offers"}
        description={
          isAr
            ? "أضف الدعايات التي تظهر للعميل في صفحة السكان."
            : "Publish the promotions customers see on the scan page."
        }
        action={
          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => setEditing({ id: null, draft: { ...EMPTY, sort_order: rows.length } })}
          >
            {isAr ? "دعاية جديدة" : "New promotion"}
          </Button>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {!loading && rows.length === 0 && (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title={isAr ? "لا توجد دعايات" : "No promotions yet"}
          description={
            isAr
              ? "أضف أول دعاية لتظهر للعملاء عند مسح رمز الفرع."
              : "Add your first promotion to show it on the customer scan page."
          }
        />
      )}

      <div className="kob-promo-admin-grid">
        {rows.map((row) => (
          <article key={row.id} className="kob-card" data-tone="raised">
            <div className="kob-card-body kob-stack">
              {row.image_url ? (
                <img src={row.image_url} alt="" className="kob-promo-admin-image" loading="lazy" />
              ) : null}
              <div className="kob-promo-admin-head">
                <h3>{row.title_ar || row.title_en || (isAr ? "دعاية" : "Promotion")}</h3>
                <Badge tone={row.is_active ? "success" : "neutral"}>
                  {row.is_active ? (isAr ? "منشورة" : "Live") : isAr ? "موقوفة" : "Paused"}
                </Badge>
              </div>
              <p className="kob-promo-admin-meta">{branchName(row.branch_id)}</p>
              <div className="kob-promo-admin-actions">
                <Toggle
                  label={isAr ? "نشر" : "Published"}
                  checked={row.is_active}
                  onCheckedChange={() => void toggleActive(row)}
                />
                <div className="kob-promo-admin-icons">
                  <IconButton
                    label={isAr ? "تعديل" : "Edit"}
                    onClick={() => setEditing({ id: row.id, draft: toInput(row) })}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={isAr ? "حذف" : "Delete"}
                    variant="danger"
                    onClick={() => setPendingDelete(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing?.id
            ? isAr
              ? "تعديل الدعاية"
              : "Edit promotion"
            : isAr
              ? "دعاية جديدة"
              : "New promotion"
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              {isAr ? "حفظ" : "Save"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="kob-stack">
            <LogoUploader
              isAr={isAr}
              folder="promotions"
              label={isAr ? "صورة الدعاية" : "Promotion image"}
              value={editing.draft.image_url || null}
              onChange={(url) => patch({ image_url: url ?? "" })}
            />
            <Input
              label={isAr ? "اسم داخلي (للإدارة فقط)" : "Internal name (admin only)"}
              value={editing.draft.title_ar}
              onChange={(e) => patch({ title_ar: e.target.value, title_en: e.target.value })}
            />
            <Input
              label={isAr ? "رابط عند الضغط (اختياري)" : "Link on tap (optional)"}
              dir="ltr"
              value={editing.draft.cta_url ?? ""}
              onChange={(e) => patch({ cta_url: e.target.value })}
            />
            <Select
              label={isAr ? "الفرع" : "Branch"}
              value={editing.draft.branch_id ?? ""}
              onChange={(e) => patch({ branch_id: e.target.value || null })}
            >
              <option value="">{isAr ? "كل الفروع" : "All branches"}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {isAr ? branch.name_ar : branch.name_en}
                </option>
              ))}
            </Select>
            <Input
              label={isAr ? "تاريخ البداية" : "Start date"}
              type="date"
              value={editing.draft.starts_at ?? ""}
              onChange={(e) => patch({ starts_at: e.target.value || null })}
            />
            <Input
              label={isAr ? "تاريخ النهاية" : "End date"}
              type="date"
              value={editing.draft.ends_at ?? ""}
              onChange={(e) => patch({ ends_at: e.target.value || null })}
            />
            <Input
              label={isAr ? "الترتيب" : "Sort order"}
              type="number"
              value={String(editing.draft.sort_order)}
              onChange={(e) => patch({ sort_order: Number(e.target.value) || 0 })}
            />
            <Toggle
              label={isAr ? "نشر على صفحة السكان" : "Publish on scan page"}
              checked={editing.draft.is_active}
              onCheckedChange={(next) => patch({ is_active: next })}
            />
          </div>
        )}

      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        title={isAr ? "حذف الدعاية" : "Delete promotion"}
        description={isAr ? "لن تظهر هذه الدعاية للعملاء بعد الحذف." : "This promotion will no longer be shown."}
        tone="danger"
      />
    </div>
  );
}
