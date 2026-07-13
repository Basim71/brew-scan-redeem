import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  ClipboardList,
  Loader2,
  Plus,
  Store,
  UserRoundCog,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { StatusPill } from "@/lib/ui";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

type Tab =
  | "overview"
  | "subs"
  | "branches"
  | "staff";

type RecentOrder = {
  id: string;
  status: string;
  created_at: string;

  branch?: {
    name_en?: string | null;
  } | null;

  drink?: {
    name_en?: string | null;
  } | null;
};

type SubscriptionRow = {
  id: string;
  status: string;

  customer?: {
    name?: string | null;
    phone?: string | null;
  } | null;

  plan?: {
    name?: string | null;
    duration_days?: number | null;
  } | null;

  branch?: {
    name_en?: string | null;
  } | null;
};

type BranchRow = {
  id: string;
  name_en: string;
  name_ar: string;
  address_en?: string | null;
};

type StaffRow = {
  id: string;
  user_id: string;
  role: string;
  branch_id?: string | null;

  branch?: {
    name_en?: string | null;
  } | null;
};

function AdminIndex() {
  const { t } = useI18n();

  const [tab, setTab] =
    useState<Tab>("overview");

  const tabs = [
    {
      key: "overview" as const,
      icon: ClipboardList,
      label: t("tab_overview"),
    },
    {
      key: "subs" as const,
      icon: Users,
      label: t("tab_subs"),
    },
    {
      key: "branches" as const,
      icon: Store,
      label: t("tab_branches"),
    },
    {
      key: "staff" as const,
      icon: UserRoundCog,
      label: t("tab_staff"),
    },
  ];

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            {t("admin_title")}
          </h1>

          <p className="kob-page-description">
            {t("admin_sub")}
          </p>
        </div>
      </div>

      <div className="kob-secondary-tabs">
        {tabs.map(
          ({
            key,
            icon: Icon,
            label,
          }) => {
            const active = tab === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                }}
                className={
                  active
                    ? "kob-secondary-tab kob-secondary-tab-active"
                    : "kob-secondary-tab"
                }
              >
                <Icon className="h-4 w-4" />

                <span>
                  {label}
                </span>
              </button>
            );
          },
        )}
      </div>

      {tab === "overview" && (
        <Overview />
      )}

      {tab === "subs" && (
        <SubscriptionsTab />
      )}

      {tab === "branches" && (
        <BranchesTab />
      )}

      {tab === "staff" && (
        <StaffTab />
      )}
    </div>
  );
}

function Overview() {
  const {
    t,
    fmtNum,
    timeAgo,
  } = useI18n();

  const [stats, setStats] = useState({
    subscriptions: 0,
    branches: 0,
    pending: 0,
    approved: 0,
  });

  const [
    recentOrders,
    setRecentOrders,
  ] = useState<RecentOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadDashboard =
    useCallback(async () => {
      const [
        subscriptionsResult,
        branchesResult,
        pendingResult,
        approvedResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "active"),

        supabase
          .from("branches")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("orders")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        supabase
          .from("orders")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "approved"),

        supabase
          .from("orders")
          .select(
            `
              id,
              status,
              created_at,
              branch:branches(name_en),
              drink:drink_types(name_en)
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      setStats({
        subscriptions:
          subscriptionsResult.count ?? 0,

        branches:
          branchesResult.count ?? 0,

        pending:
          pendingResult.count ?? 0,

        approved:
          approvedResult.count ?? 0,
      });

      setRecentOrders(
        (ordersResult.data ??
          []) as unknown as RecentOrder[],
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadDashboard();

    const interval =
      window.setInterval(() => {
        void loadDashboard();
      }, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const statCards = [
    {
      label: t("stat_subs"),
      value: stats.subscriptions,
      icon: Users,
    },
    {
      label: t("stat_branches"),
      value: stats.branches,
      icon: Store,
    },
    {
      label: t("stat_pending"),
      value: stats.pending,
      icon: ClipboardList,
    },
    {
      label: t("stat_approved"),
      value: stats.approved,
      icon: Store,
    },
  ];

  return (
    <>
      <div className="kob-stats-grid">
        {statCards.map(
          ({
            label,
            value,
            icon: Icon,
          }) => (
            <article
              key={label}
              className="kob-stat-card panel-warm"
            >
              <div className="kob-stat-card-top">
                <span className="kob-stat-label">
                  {label}
                </span>

                <span className="kob-stat-icon">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              <strong className="kob-stat-value">
                {fmtNum(value)}
              </strong>
            </article>
          ),
        )}
      </div>

      <section className="panel kob-content-card">
        <div className="kob-card-header">
          <h2 className="kob-card-title">
            {t("recent_activity")}
          </h2>

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-caramel" />
          )}
        </div>

        <div className="kob-table-wrapper engraved">
          <table className="kob-table min-w-[720px]">
            <thead>
              <tr>
                <th>
                  {t("col_coffee")}
                </th>

                <th>
                  {t("col_branch")}
                </th>

                <th>
                  {t("col_status")}
                </th>

                <th className="text-end">
                  {t("col_when")}
                </th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map(
                (order) => (
                  <tr key={order.id}>
                    <td className="text-cream">
                      {order.drink
                        ?.name_en ?? "—"}
                    </td>

                    <td className="text-cream-dim">
                      {order.branch
                        ?.name_en ?? "—"}
                    </td>

                    <td>
                      <StatusPill
                        s={order.status}
                      />
                    </td>

                    <td className="text-end text-cream-dim">
                      {timeAgo(
                        order.created_at,
                      )}
                    </td>
                  </tr>
                ),
              )}

              {!loading &&
                recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-cream-dim"
                    >
                      {t("empty_orders")}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function SubscriptionsTab() {
  const { t } = useI18n();

  const [rows, setRows] =
    useState<SubscriptionRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadSubscriptions =
    useCallback(async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select(
          `
            *,
            customer:customers(name,phone),
            plan:plans(name,duration_days),
            branch:branches(name_en)
          `,
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      setRows(
        (data ??
          []) as unknown as SubscriptionRow[],
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  return (
    <section className="panel kob-content-card">
      <div className="kob-card-header">
        <h2 className="kob-card-title">
          {t("all_subs")}
        </h2>

        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-caramel" />
        )}
      </div>

      <div className="kob-table-wrapper engraved">
        <table className="kob-table min-w-[850px]">
          <thead>
            <tr>
              <th>
                {t("col_phone")}
              </th>

              <th>
                {t("col_customer")}
              </th>

              <th>
                {t("col_plan")}
              </th>

              <th>
                {t("col_branch")}
              </th>

              <th className="text-end">
                {t("col_status")}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-mono text-cream">
                  {row.customer?.phone ??
                    "—"}
                </td>

                <td className="text-cream-dim">
                  {row.customer?.name ??
                    "—"}
                </td>

                <td className="text-cream">
                  {row.plan?.name ?? "—"}
                </td>

                <td className="text-cream-dim">
                  {row.branch?.name_en ??
                    "—"}
                </td>

                <td className="text-end">
                  <StatusPill
                    s={row.status}
                  />
                </td>
              </tr>
            ))}

            {!loading &&
              rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-cream-dim"
                  >
                    {t("empty_subs")}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchesTab() {
  const { t } = useI18n();

  const [rows, setRows] =
    useState<BranchRow[]>([]);

  const [form, setForm] = useState({
    name_en: "",
    name_ar: "",
    address_en: "",
  });

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadBranches =
    useCallback(async () => {
      const { data } = await supabase
        .from("branches")
        .select("*")
        .order("name_en");

      setRows(
        (data ?? []) as BranchRow[],
      );
    }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  async function createBranch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setMessage(null);

    const { error } = await supabase
      .from("branches")
      .insert({
        name_en:
          form.name_en.trim(),

        name_ar:
          form.name_ar.trim(),

        address_en:
          form.address_en.trim() ||
          null,
      });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      name_en: "",
      name_ar: "",
      address_en: "",
    });

    await loadBranches();
  }

  return (
    <>
      <section className="panel-warm kob-content-card mb-6">
        <h2 className="kob-card-title mb-5">
          {t("new_branch")}
        </h2>

        <form
          onSubmit={createBranch}
          className="kob-form-grid"
        >
          <FormInput
            label={`${t("f_name")} (EN)`}
            value={form.name_en}
            required
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                name_en: value,
              }));
            }}
          />

          <FormInput
            label={`${t("f_name")} (AR)`}
            value={form.name_ar}
            required
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                name_ar: value,
              }));
            }}
          />

          <FormInput
            label={t("f_address")}
            value={form.address_en}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                address_en: value,
              }));
            }}
          />

          <button
            type="submit"
            disabled={busy}
            className="btn-brass kob-form-button"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            <span>
              {t("btn_create")}
            </span>
          </button>
        </form>

        {message && (
          <div className="engraved mt-4 px-4 py-3 text-sm text-cream-dim">
            {message}
          </div>
        )}
      </section>

      <div className="kob-branches-grid">
        {rows.map((branch) => (
          <article
            key={branch.id}
            className="panel kob-branch-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-xl font-bold text-cream">
                  {branch.name_en}
                </h3>

                <p className="mt-2 text-sm text-cream-dim">
                  {branch.address_en ||
                    "—"}
                </p>
              </div>

              <span className="engraved shrink-0 rounded-lg px-3 py-1.5 text-xs gold-text">
                {branch.name_ar}
              </span>
            </div>

            <div className="hairline-divider my-5" />

            <a
              href={`/scan?branch=${encodeURIComponent(branch.id)}`}
              className="btn-ghost-brass block w-full px-4 py-3 text-center text-sm"
            >
              {t("open_scan_link")}
            </a>
          </article>
        ))}

        {rows.length === 0 && (
          <div className="panel col-span-full p-10 text-center text-cream-dim">
            {t("empty_branches")}
          </div>
        )}
      </div>
    </>
  );
}

function StaffTab() {
  const { t } = useI18n();

  const [users, setUsers] =
    useState<StaffRow[]>([]);

  const [branches, setBranches] =
    useState<BranchRow[]>([]);

  const [form, setForm] = useState({
    user_id: "",
    role: "cashier",
    branch_id: "",
  });

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const loadStaff =
    useCallback(async () => {
      const [
        rolesResult,
        branchesResult,
      ] = await Promise.all([
        supabase
          .from("user_roles")
          .select(
            `
              id,
              user_id,
              role,
              branch_id,
              branch:branches(name_en)
            `,
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("branches")
          .select("*")
          .order("name_en"),
      ]);

      setUsers(
        (rolesResult.data ??
          []) as unknown as StaffRow[],
      );

      setBranches(
        (branchesResult.data ??
          []) as BranchRow[],
      );
    }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function assignRole(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setMessage(null);

    const { error } = await supabase
      .from("user_roles")
      .insert({
        user_id:
          form.user_id.trim(),

        role:
          form.role as
            | "admin"
            | "cashier",

        branch_id:
          form.branch_id || null,
      });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      user_id: "",
      role: "cashier",
      branch_id: "",
    });

    setMessage("Assigned.");

    await loadStaff();
  }

  return (
    <>
      <section className="panel-warm kob-content-card mb-6">
        <h2 className="kob-card-title">
          {t("assign_role")}
        </h2>

        <p className="mb-5 mt-2 text-xs leading-6 text-cream-dim">
          {t("assign_hint")}
        </p>

        <form
          onSubmit={assignRole}
          className="kob-form-grid"
        >
          <FormInput
            label={t("f_user_id")}
            value={form.user_id}
            required
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                user_id: value,
              }));
            }}
          />

          <FormSelect
            label={t("f_role")}
            value={form.role}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                role: value,
              }));
            }}
            options={[
              {
                value: "cashier",
                label: t("role_cashier"),
              },
              {
                value: "admin",
                label: t("role_admin"),
              },
            ]}
          />

          <FormSelect
            label={t("f_branch")}
            value={form.branch_id}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                branch_id: value,
              }));
            }}
            options={[
              {
                value: "",
                label: "—",
              },
              ...branches.map(
                (branch) => ({
                  value: branch.id,
                  label:
                    branch.name_en,
                }),
              ),
            ]}
          />

          <button
            type="submit"
            disabled={busy}
            className="btn-brass kob-form-button"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            <span>
              {t("btn_assign")}
            </span>
          </button>
        </form>

        {message && (
          <div className="engraved mt-4 px-4 py-3 text-sm text-cream-dim">
            {message}
          </div>
        )}
      </section>

      <section className="panel kob-content-card">
        <h2 className="kob-card-title mb-5">
          {t("staff_members")}
        </h2>

        <div className="kob-table-wrapper engraved">
          <table className="kob-table min-w-[720px]">
            <thead>
              <tr>
                <th>
                  {t("col_user_id")}
                </th>

                <th>
                  {t("col_role")}
                </th>

                <th>
                  {t("col_branch")}
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-mono text-xs text-cream-dim">
                    {user.user_id}
                  </td>

                  <td>
                    <StatusPill
                      s={user.role}
                    />
                  </td>

                  <td className="text-cream">
                    {user.branch
                      ?.name_en ?? "—"}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-10 text-center text-cream-dim"
                  >
                    {t("empty_roles")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
  required?: boolean;
};

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: FormInputProps) {
  return (
    <label className="block min-w-0">
      <span className="kob-field-label">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => {
          onChange(
            event.target.value,
          );
        }}
        className="inset-well kob-field-control"
      />
    </label>
  );
}

type FormSelectProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;

  options: Array<{
    value: string;
    label: string;
  }>;
};

function FormSelect({
  label,
  value,
  onChange,
  options,
}: FormSelectProps) {
  return (
    <label className="block min-w-0">
      <span className="kob-field-label">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => {
          onChange(
            event.target.value,
          );
        }}
        className="inset-well kob-field-control"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
