import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import { CafeDialog, CafePage } from "@/features/company/cafe/ui";
import { LogoUploader } from "@/features/company/settings/LogoUploader";
import { getOrganizationProfile } from "@/services/company/company-settings.service";
import { listPlans } from "@/services/company/plans.service";
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

export const Route = createFileRoute("/admin/promotions")({
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

function PromotionsPage() {
  const { t, lang, fmtNum } = useI18n();
  const isAr = lang === "ar";
  const { organization } = useOrganization();
  const orgId = organization?.id ?? null;
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [branches, setBranches] = useState<ScanBranchOption[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [color, setColor] = useState("#1f3b34");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string | null;
    draft: PromotionInput;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const [promos, branchList, profile, plans] = await Promise.all([
        listPromotions(orgId),
        listOrganizationBranches(orgId),
        getOrganizationProfile(orgId),
        listPlans(),
      ]);
      setRows(promos);
      setBranches(branchList);
      setLogo(profile?.logo_url ?? null);
      setColor(profile?.primary_color || "#1f3b34");
      const plan =
        plans.find((item) => item.is_active && !item.archived_at) ?? plans[0];
      setPlanName(
        plan
          ? isAr
            ? plan.name_ar || plan.name_en
            : plan.name_en || plan.name_ar
          : "",
      );
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.promo.saveError"),
      );
    }
  }, [isAr, orgId, t]);

  useEffect(() => {
    void load();
    if (window.location.hash === "#new")
      setEditing({ id: null, draft: { ...EMPTY } });
  }, [load]);

  const preview = useMemo(
    () => rows.find((row) => row.is_active) ?? rows[0] ?? null,
    [rows],
  );
  const cafeName = isAr
    ? organization?.nameAr || organization?.nameEn
    : organization?.nameEn || organization?.nameAr;

  async function persist(id: string | null, draft: PromotionInput) {
    if (!orgId) return;
    if (!draft.title_ar.trim() || !draft.title_en.trim()) {
      setError(t("cafe.promo.namesRequired"));
      return;
    }
    setBusy(true);
    try {
      if (id) await updatePromotion(id, draft);
      else await createPromotion(orgId, { ...draft, sort_order: rows.length });
      setEditing(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.promo.saveError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(row: PromotionRow, direction: -1 | 1) {
    const index = rows.findIndex((item) => item.id === row.id);
    const next = rows[index + direction];
    if (!next) return;
    await updatePromotion(row.id, { sort_order: next.sort_order });
    await updatePromotion(next.id, { sort_order: row.sort_order });
    setMenu(null);
    await load();
  }

  return (
    <CafePage
      title={t("cafe.promo.title")}
      subtitle={t("cafe.promo.subtitle")}
      action={
        <button
          type="button"
          className="cafe-btn"
          onClick={() =>
            setEditing({
              id: null,
              draft: { ...EMPTY, sort_order: rows.length },
            })
          }
        >
          {t("cafe.promo.new")}
        </button>
      }
    >
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-split">
        <section className="cafe-card">
          <h2>{t("cafe.promo.yours")}</h2>
          {rows.length === 0 ? (
            <div className="cafe-empty">{t("cafe.promo.empty")}</div>
          ) : null}
          {rows.map((row) => (
            <article
              key={row.id}
              className="cafe-row"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData("text/plain", row.id)
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const source = event.dataTransfer.getData("text/plain");
                const from = rows.findIndex((item) => item.id === source);
                const to = rows.findIndex((item) => item.id === row.id);
                if (from < 0 || to < 0 || from === to) return;
                void move(rows[from], to > from ? 1 : -1);
              }}
            >
              <div
                className="cafe-thumb"
                style={{
                  background: row.image_url
                    ? `center/cover url(${row.image_url})`
                    : "#f0e2d2",
                  width: 72,
                }}
              />
              <div className="n">
                <b>{isAr ? row.title_ar : row.title_en}</b>
                <div>
                  <span
                    className={
                      row.is_active ? "cafe-status" : "cafe-status muted"
                    }
                  >
                    {row.is_active
                      ? t("cafe.promo.live")
                      : t("cafe.promo.hidden")}
                  </span>
                  {" · "}
                  {row.branch_id
                    ? branches.find((branch) => branch.id === row.branch_id)?.[
                        isAr ? "name_ar" : "name_en"
                      ]
                    : t("cafe.plans.allBranches")}
                </div>
              </div>
              <button
                type="button"
                className={row.is_active ? "cafe-switch" : "cafe-switch off"}
                onClick={() =>
                  void updatePromotion(row.id, {
                    is_active: !row.is_active,
                  }).then(load)
                }
              >
                <i />
                {row.is_active
                  ? t("cafe.promo.visible")
                  : t("cafe.promo.hidden")}
              </button>
              <div className="cafe-menu">
                <button
                  type="button"
                  aria-label={t("cafe.more")}
                  onClick={() => setMenu(menu === row.id ? null : row.id)}
                >
                  ⋯
                </button>
                {menu === row.id ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing({
                          id: row.id,
                          draft: {
                            ...row,
                            body_ar: row.body_ar ?? "",
                            body_en: row.body_en ?? "",
                            image_url: row.image_url ?? "",
                            cta_label_ar: row.cta_label_ar ?? "",
                            cta_label_en: row.cta_label_en ?? "",
                            cta_url: row.cta_url ?? "",
                          },
                        });
                        setMenu(null);
                      }}
                    >
                      {t("cafe.edit")}
                    </button>
                    <button type="button" onClick={() => void move(row, -1)}>
                      {t("cafe.promo.up")}
                    </button>
                    <button type="button" onClick={() => void move(row, 1)}>
                      {t("cafe.promo.down")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePromotion(row.id).then(load)}
                    >
                      {t("cafe.delete")}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          <p className="cafe-note">{t("cafe.promo.reorder")}</p>
        </section>
        <section className="cafe-card">
          <h2>{t("cafe.promo.previewTitle")}</h2>
          <p className="cafe-muted">{t("cafe.promo.previewNote")}</p>
          <div className="cafe-phone">
            <div className="scr">
              <div style={{ fontWeight: 800 }}>{t("cafe.promo.hello")}</div>
              <div className="cafe-muted">{t("cafe.promo.yourSubs")}</div>
              <div
                className="bn"
                style={{
                  backgroundImage: preview?.image_url
                    ? `url(${preview.image_url})`
                    : undefined,
                }}
              />
              <div className="cafe-note">
                {t("cafe.promo.adFrom", { name: cafeName || "KOB" })}
              </div>
              <div className="cafe-subcard" style={{ background: color }}>
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    style={{ height: 28, borderRadius: 6 }}
                  />
                ) : null}
                <div style={{ fontWeight: 800, marginTop: 8 }}>
                  {planName || t("cafe.plans.example")}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <div>
                    <b>{fmtNum(0)}</b>
                    <div style={{ opacity: 0.8 }}>
                      {t("cafe.promo.cupsToday")}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    background: "#c8924a",
                    color: "#2b1a12",
                    fontWeight: 800,
                    borderRadius: 12,
                    padding: 8,
                  }}
                >
                  {t("cafe.promo.order")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {editing ? (
        <CafeDialog
          title={editing.id ? t("cafe.promo.edit") : t("cafe.promo.newTitle")}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                type="button"
                className="cafe-btn ghost"
                onClick={() => setEditing(null)}
              >
                {t("cafe.cancel")}
              </button>
              <button
                type="button"
                className="cafe-btn"
                disabled={busy}
                onClick={() => void persist(editing.id, editing.draft)}
              >
                {t("cafe.save")}
              </button>
            </>
          }
        >
          <div>
            <div className="cafe-two">
              <label>
                <span className="cafe-label">{t("cafe.drinks.nameAr")}</span>
                <input
                  className="cafe-input"
                  value={editing.draft.title_ar}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, title_ar: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                <span className="cafe-label">{t("cafe.drinks.nameEn")}</span>
                <input
                  className="cafe-input"
                  dir="ltr"
                  value={editing.draft.title_en}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, title_en: event.target.value },
                    })
                  }
                />
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="cafe-label">{t("cafe.plans.branches")}</span>
              <div className="cafe-chips">
                <button
                  type="button"
                  className={
                    !editing.draft.branch_id
                      ? "cafe-chip mini on"
                      : "cafe-chip mini"
                  }
                  onClick={() =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, branch_id: null },
                    })
                  }
                >
                  {t("cafe.plans.allBranches")}
                </button>
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    className={
                      editing.draft.branch_id === branch.id
                        ? "cafe-chip mini on"
                        : "cafe-chip mini"
                    }
                    onClick={() =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, branch_id: branch.id },
                      })
                    }
                  >
                    {isAr ? branch.name_ar : branch.name_en}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <aside className="cafe-preview">
            <LogoUploader
              isAr={isAr}
              folder={`promos/${orgId ?? "cafe"}`}
              value={editing.draft.image_url || null}
              onChange={(url) =>
                setEditing({
                  ...editing,
                  draft: { ...editing.draft, image_url: url ?? "" },
                })
              }
            />
          </aside>
        </CafeDialog>
      ) : null}
    </CafePage>
  );
}
