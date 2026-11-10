import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { CafeDialog } from "@/features/company/cafe/ui";
import type { BranchRow } from "@/services/company/branches.service";
import type { DrinkTypeRow } from "@/services/company/drinks.service";
import {
  createPlan,
  updatePlan,
  type Plan,
  type PlanInput,
} from "@/services/company/plans.service";
import { COLOR_SWATCHES, emptyDraft } from "./types";

type Kind = "daily" | "open";

const DURATIONS = [
  { days: 7, key: "cafe.plans.week" },
  { days: 30, key: "cafe.plans.month" },
  { days: 90, key: "cafe.plans.quarter" },
] as const;

function fromPlan(
  plan: Plan | null,
): PlanInput & { kind: Kind; totalCups: number } {
  const base = emptyDraft();
  if (!plan) return { ...base, kind: "daily", totalCups: 40 };
  const kind: Kind =
    plan.redemption_frequency !== "daily" && plan.max_redemptions_per_period
      ? "open"
      : "daily";
  return {
    ...base,
    ...plan,
    kind,
    totalCups: plan.max_redemptions_per_period ?? plan.max_drinks_per_day ?? 10,
  };
}

export function PlanDialog({
  organizationId,
  editing,
  drinks,
  branches,
  onClose,
  onSaved,
}: {
  organizationId: string;
  editing: Plan | null;
  drinks: DrinkTypeRow[];
  branches: BranchRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang, fmtNum } = useI18n();
  const isAr = lang === "ar";
  const [draft, setDraft] = useState(() => fromPlan(editing));
  const [pickDrinks, setPickDrinks] = useState(
    editing ? editing.allowed_drink_ids.length > 0 : false,
  );
  const [pickBranches, setPickBranches] = useState(
    editing ? editing.allowed_branch_ids.length > 0 : false,
  );
  const [extra, setExtra] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo<PlanInput>(() => {
    const open = draft.kind === "open";
    return {
      ...draft,
      price: Number(draft.price) || 0,
      duration_days: draft.duration_days,
      max_drinks_per_day: open
        ? Math.max(1, draft.totalCups)
        : draft.max_drinks_per_day,
      max_redemptions_per_period: open ? Math.max(1, draft.totalCups) : null,
      redemption_frequency: open ? "custom" : "daily",
      allowed_drink_ids: pickDrinks ? draft.allowed_drink_ids : [],
      allowed_branch_ids: pickBranches ? draft.allowed_branch_ids : [],
      excluded_branch_ids: [],
      is_active: true,
    };
  }, [draft, pickBranches, pickDrinks]);

  const drinkLabel = !pickDrinks
    ? t("cafe.plans.allDrinks")
    : t("cafe.plans.nDrinks", { n: fmtNum(payload.allowed_drink_ids.length) });
  const branchLabel = !pickBranches
    ? t("cafe.plans.allBranches")
    : payload.allowed_branch_ids.length === 1
      ? t("cafe.plans.oneBranch")
      : t("cafe.plans.nBranches", {
          n: fmtNum(payload.allowed_branch_ids.length),
        });
  const cupLabel =
    draft.kind === "open"
      ? t("cafe.plans.totalLine", { n: fmtNum(draft.totalCups) })
      : t("cafe.plans.dailyLine", { n: fmtNum(draft.max_drinks_per_day) });

  function toggleId(list: string[], id: string) {
    return list.includes(id)
      ? list.filter((item) => item !== id)
      : [...list, id];
  }

  async function save() {
    if (!draft.name_ar.trim() || !draft.name_en.trim()) {
      setError(t("cafe.plans.namesRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) await updatePlan(editing.id, payload, organizationId);
      else await createPlan(payload, organizationId);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.plans.saveError"),
      );
      setBusy(false);
    }
  }

  const title = draft.name_ar.trim() || t("cafe.plans.example");

  return (
    <CafeDialog
      title={editing ? t("cafe.plans.editTitle") : t("cafe.plans.newTitle")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-btn ghost" onClick={onClose}>
            {t("cafe.cancel")}
          </button>
          <button
            type="button"
            className="cafe-btn"
            disabled={busy}
            onClick={() => void save()}
          >
            {t("cafe.plans.publish")}
          </button>
        </>
      }
    >
      <div>
        {error ? <div className="cafe-error">{error}</div> : null}
        <span className="cafe-label">{t("cafe.plans.type")}</span>
        <div className="cafe-types">
          <button
            type="button"
            className={draft.kind === "daily" ? "on" : ""}
            onClick={() => setDraft({ ...draft, kind: "daily" })}
          >
            <b>{t("cafe.plans.daily")}</b>
            {t("cafe.plans.dailyHint")}
          </button>
          <button
            type="button"
            className={draft.kind === "open" ? "on" : ""}
            onClick={() => setDraft({ ...draft, kind: "open" })}
          >
            <b>{t("cafe.plans.open")}</b>
            {t("cafe.plans.openHint")}
          </button>
        </div>
        <div className="cafe-two" style={{ marginTop: 12 }}>
          <label>
            <span className="cafe-label">{t("cafe.plans.nameAr")}</span>
            <input
              className="cafe-input"
              value={draft.name_ar}
              onChange={(event) =>
                setDraft({ ...draft, name_ar: event.target.value })
              }
              placeholder={t("cafe.plans.example")}
            />
          </label>
          <label>
            <span className="cafe-label">{t("cafe.plans.nameEn")}</span>
            <input
              className="cafe-input"
              dir="ltr"
              value={draft.name_en}
              onChange={(event) =>
                setDraft({ ...draft, name_en: event.target.value })
              }
              placeholder="Morning Plan"
            />
          </label>
        </div>
        <div
          className="cafe-two"
          style={{ marginTop: 12, gridTemplateColumns: "1fr 1.2fr 1fr" }}
        >
          <label>
            <span className="cafe-label">{t("cafe.plans.price")}</span>
            <input
              className="cafe-input"
              inputMode="decimal"
              value={draft.price || ""}
              placeholder={t("cafe.sar")}
              onChange={(event) =>
                setDraft({ ...draft, price: Number(event.target.value) || 0 })
              }
            />
          </label>
          <div>
            <span className="cafe-label">{t("cafe.plans.duration")}</span>
            <div className="cafe-chips">
              {DURATIONS.map((item) => (
                <button
                  key={item.days}
                  type="button"
                  className={
                    draft.duration_days === item.days
                      ? "cafe-chip mini on"
                      : "cafe-chip mini"
                  }
                  onClick={() =>
                    setDraft({ ...draft, duration_days: item.days })
                  }
                >
                  {t(item.key)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="cafe-label">
              {draft.kind === "open"
                ? t("cafe.plans.totalCups")
                : t("cafe.plans.perDay")}
            </span>
            {draft.kind === "daily" ? (
              <div className="cafe-chips">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={
                      draft.max_drinks_per_day === count
                        ? "cafe-chip mini on"
                        : "cafe-chip mini"
                    }
                    onClick={() =>
                      setDraft({ ...draft, max_drinks_per_day: count })
                    }
                  >
                    {fmtNum(count)}
                  </button>
                ))}
              </div>
            ) : (
              <input
                className="cafe-input"
                inputMode="numeric"
                value={draft.totalCups}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    totalCups:
                      Number(event.target.value.replace(/[^\d]/g, "")) || 0,
                  })
                }
              />
            )}
          </div>
        </div>
        <div className="cafe-two" style={{ marginTop: 12 }}>
          <div>
            <span className="cafe-label">{t("cafe.plans.drinks")}</span>
            <div className="cafe-chips">
              <button
                type="button"
                className={!pickDrinks ? "cafe-chip mini on" : "cafe-chip mini"}
                onClick={() => setPickDrinks(false)}
              >
                {t("cafe.plans.allDrinks")}
              </button>
              <button
                type="button"
                className={pickDrinks ? "cafe-chip mini on" : "cafe-chip mini"}
                onClick={() => setPickDrinks(true)}
              >
                {t("cafe.plans.pick")}
              </button>
            </div>
            {pickDrinks ? (
              <div className="cafe-chips" style={{ marginTop: 8 }}>
                {drinks.map((drink) => (
                  <button
                    key={drink.id}
                    type="button"
                    className={
                      draft.allowed_drink_ids.includes(drink.id)
                        ? "cafe-chip mini on"
                        : "cafe-chip mini"
                    }
                    onClick={() =>
                      setDraft({
                        ...draft,
                        allowed_drink_ids: toggleId(
                          draft.allowed_drink_ids,
                          drink.id,
                        ),
                      })
                    }
                  >
                    {isAr ? drink.name_ar : drink.name_en}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <span className="cafe-label">{t("cafe.plans.branches")}</span>
            <div className="cafe-chips">
              <button
                type="button"
                className={
                  !pickBranches ? "cafe-chip mini on" : "cafe-chip mini"
                }
                onClick={() => setPickBranches(false)}
              >
                {t("cafe.plans.allBranches")}
              </button>
              <button
                type="button"
                className={
                  pickBranches ? "cafe-chip mini on" : "cafe-chip mini"
                }
                onClick={() => setPickBranches(true)}
              >
                {t("cafe.plans.pick")}
              </button>
            </div>
            {pickBranches ? (
              <div className="cafe-chips" style={{ marginTop: 8 }}>
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    className={
                      draft.allowed_branch_ids.includes(branch.id)
                        ? "cafe-chip mini on"
                        : "cafe-chip mini"
                    }
                    onClick={() =>
                      setDraft({
                        ...draft,
                        allowed_branch_ids: toggleId(
                          draft.allowed_branch_ids,
                          branch.id,
                        ),
                      })
                    }
                  >
                    {isAr ? branch.name_ar : branch.name_en}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="cafe-more"
          style={{ marginTop: 14 }}
          onClick={() => setExtra((value) => !value)}
        >
          {t("cafe.plans.optional")}
        </button>
        {extra ? (
          <div style={{ marginTop: 12 }}>
            <span className="cafe-label">{t("cafe.plans.color")}</span>
            <div className="cafe-colors">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={draft.color === color ? "on" : ""}
                  style={{ background: color }}
                  onClick={() => setDraft({ ...draft, color })}
                  aria-label={color}
                />
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="cafe-label">{t("cafe.plans.badge")}</span>
              <div className="cafe-chips">
                {[
                  [null, "cafe.plans.badgeNone"],
                  ["limited", "cafe.plans.limited"],
                  ["most_popular", "cafe.plans.popular"],
                ].map(([value, key]) => (
                  <button
                    key={String(value)}
                    type="button"
                    className={
                      draft.badge === value
                        ? "cafe-chip mini on"
                        : "cafe-chip mini"
                    }
                    onClick={() => setDraft({ ...draft, badge: value })}
                  >
                    {t(key as string)}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display: "block", marginTop: 10 }}>
              <span className="cafe-label">{t("cafe.plans.bonus")}</span>
              <input
                className="cafe-input"
                inputMode="numeric"
                value={draft.bonus_days || ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    bonus_days:
                      Number(event.target.value.replace(/[^\d]/g, "")) || 0,
                  })
                }
              />
            </label>
          </div>
        ) : null}
      </div>
      <aside className="cafe-preview">
        <div className="cafe-label">{t("cafe.plans.preview")}</div>
        <article
          className="cafe-plan"
          style={{ background: draft.color || "#6b4226" }}
        >
          <div className="top">
            <span className="nm">{title}</span>
            {draft.badge === "limited" ? (
              <span className="bd">{t("cafe.plans.limited")}</span>
            ) : null}
          </div>
          <div className="cafe-muted" style={{ color: "#f5ebdd" }}>
            {draft.kind === "open"
              ? t("cafe.plans.open")
              : t("cafe.plans.daily")}
          </div>
          <div className="pr">
            {draft.price ? fmtNum(Number(draft.price)) : "—"}{" "}
            <small>
              {t("cafe.plans.perDuration", {
                days: fmtNum(draft.duration_days),
              })}
            </small>
          </div>
          <ul>
            <li>{cupLabel}</li>
            <li>{drinkLabel}</li>
            <li>{branchLabel}</li>
            {draft.bonus_days > 0 ? (
              <li>
                {t("cafe.plans.bonusLine", { n: fmtNum(draft.bonus_days) })}
              </li>
            ) : null}
          </ul>
        </article>
      </aside>
    </CafeDialog>
  );
}
