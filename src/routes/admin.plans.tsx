import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import { CafePage } from "@/features/company/cafe/ui";
import { PlanDialog } from "@/features/company/plans/PlanDialog";
import {
  listBranches,
  type BranchRow,
} from "@/services/company/branches.service";
import {
  listDrinks,
  type DrinkTypeRow,
} from "@/services/company/drinks.service";
import {
  listPlans,
  setPlanActive,
  type Plan,
} from "@/services/company/plans.service";
import { MembershipSection } from "@/features/company/settings/CompanySettingsShell";
import { useCompanySettings } from "@/features/company/settings/useCompanySettings";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

function PlansPage() {
  const { t, lang, fmtNum } = useI18n();
  const isAr = lang === "ar";
  const { organization, role } = useOrganization();
  const [rows, setRows] = useState<Plan[]>([]);
  const [drinks, setDrinks] = useState<DrinkTypeRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | null | undefined>(undefined);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const settingsApi = useCompanySettings();

  const load = useCallback(async () => {
    try {
      const [plans, drinkRows, branchRows] = await Promise.all([
        listPlans(),
        listDrinks(),
        listBranches(),
      ]);
      setRows(plans.filter((plan) => !plan.archived_at));
      setDrinks(drinkRows);
      setBranches(branchRows);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.plans.saveError"),
      );
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(plan: Plan) {
    try {
      await setPlanActive(plan.id, !plan.is_active);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.plans.saveError"),
      );
    }
  }

  return (
    <CafePage
      title={t("cafe.plans.title")}
      subtitle={t("cafe.plans.subtitle")}
      action={
        <button
          type="button"
          className="cafe-btn"
          onClick={() => setEditing(null)}
        >
          {t("cafe.plans.new")}
        </button>
      }
    >
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-plans">
        {rows.map((plan) => {
          const open =
            plan.redemption_frequency !== "daily" &&
            plan.max_redemptions_per_period;
          const drinkCount = plan.allowed_drink_ids.length;
          const branchCount =
            plan.allowed_branch_ids.length ||
            Math.max(0, branches.length - plan.excluded_branch_ids.length);
          const allBranches = plan.allowed_branch_ids.length === 0;
          return (
            <article
              key={plan.id}
              className="cafe-plan"
              style={{ background: plan.color || "#6b4226" }}
            >
              <div className="top">
                <span className="nm">
                  {isAr
                    ? plan.name_ar || plan.name_en
                    : plan.name_en || plan.name_ar}
                </span>
                {plan.badge === "limited" ? (
                  <span className="bd">{t("cafe.plans.limited")}</span>
                ) : null}
              </div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                {open ? t("cafe.plans.open") : t("cafe.plans.daily")}
              </div>
              <div className="pr">
                {fmtNum(Number(plan.price))}{" "}
                <small>
                  {t("cafe.plans.perDuration", {
                    days: fmtNum(plan.duration_days),
                  })}
                </small>
              </div>
              <ul>
                <li>
                  {open
                    ? t("cafe.plans.totalLine", {
                        n: fmtNum(
                          plan.max_redemptions_per_period ??
                            plan.max_drinks_per_day,
                        ),
                      })
                    : t("cafe.plans.dailyLine", {
                        n: fmtNum(plan.max_drinks_per_day),
                      })}
                </li>
                <li>
                  {drinkCount
                    ? t("cafe.plans.nDrinks", { n: fmtNum(drinkCount) })
                    : t("cafe.plans.allDrinks")}
                </li>
                <li>
                  {allBranches
                    ? t("cafe.plans.allBranches")
                    : branchCount === 1
                      ? t("cafe.plans.oneBranch")
                      : t("cafe.plans.nBranches", { n: fmtNum(branchCount) })}
                </li>
                {plan.bonus_days > 0 ? (
                  <li>
                    {t("cafe.plans.bonusLine", { n: fmtNum(plan.bonus_days) })}
                  </li>
                ) : null}
              </ul>
              <div className="ft">
                <button
                  type="button"
                  className={plan.is_active ? "cafe-switch" : "cafe-switch off"}
                  onClick={() => void toggle(plan)}
                >
                  <i />
                  {plan.is_active
                    ? t("cafe.plans.selling")
                    : t("cafe.plans.paused")}
                </button>
                <button
                  type="button"
                  className="cafe-link"
                  style={{ color: "#fff" }}
                  onClick={() => setEditing(plan)}
                >
                  {t("cafe.edit")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <section className="cafe-card">
        <h2>
          {t("cafe.plans.membership")}
          <button
            type="button"
            className="cafe-link"
            onClick={() => setMembershipOpen((value) => !value)}
          >
            {membershipOpen ? t("cafe.hide") : t("cafe.show")}
          </button>
        </h2>
        {membershipOpen && settingsApi.settings && organization ? (
          <MembershipSection
            settings={settingsApi.settings}
            profile={null}
            organizationId={organization.id}
            isAr={isAr}
            canEdit={role === "owner" || role === "admin"}
            isOwner={role === "owner"}
            commit={async (patch, section) => {
              await settingsApi.save(patch, section);
            }}
            commitProfile={async () => undefined}
          />
        ) : (
          <p className="cafe-muted">{t("cafe.plans.membershipHint")}</p>
        )}
      </section>
      {editing !== undefined && organization ? (
        <PlanDialog
          organizationId={organization.id}
          editing={editing}
          drinks={drinks}
          branches={branches}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void load();
          }}
        />
      ) : null}
    </CafePage>
  );
}
