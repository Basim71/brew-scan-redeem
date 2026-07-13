import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Building2,
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

type Tab = "overview" | "subs" | "branches" | "staff";

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
  const [tab, setTab] = useState<Tab>("overview");

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
      <div className="panel mb-6 p-2">
        <div className="flex w-full gap-2 overflow-x-auto pb-1">
          {tabs.map(({ key, icon: Icon, label }) => {
            const isActive = tab === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={
                  "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition " +
                  (isActive
                    ? "btn-brass"
                    : "text-cream-dim hover:bg-white/5 hover:text-caramel-bright")
                }
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && <Overview />}
      {tab === "subs" && <SubscriptionsTab />}
      {tab === "branches" && <BranchesTab />}
      {tab === "staff" && <StaffTab />}
    </div>
  );
}

function Overview() {
  const { t, fmtNum, timeAgo } = useI18n();

  const [stats, setStats] = useState({
    subscriptions: 0,
    branches: 0,
    pending: 0,
    approved: 0,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
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
      subscriptions: subscriptionsResult.count ?? 0,
      branches: branchesResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      approved: approvedResult.count ?? 0,
    });

    setRecentOrders(
      (ordersResult.data ?? []) as unknown as RecentOrder[],
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();

    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
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
      icon: Building2,
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="panel-warm min-w-0 p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim">
                {label}
              </div>

              <div className="engraved flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="h-4 w-4 text-caramel-bright" />
              </div>
            </div>

            <div className="font-display text-4xl font-bold gold-text">
              {fmtNum(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="panel min-w-0 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-cream">
            {t("recent_activity")}
          </h2>

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-caramel" />
          )}
        </div>

        <div className="engraved w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-cream-dim">
                <th className="px-4 py-3 text-start">
                  {t("col_coffee")}
                </th>

                <th className="px-4 py-3 text-start">
                  {t("col_branch")}
                </th>

                <th className="px-4 py-3 text-start">
                  {t("col_status")}
                </th>

                <th className="px-4 py-3 text-end">
                  {t("col_when")}
                </th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-[oklch(0.08_0.02_40)]"
                >
                  <td className="px-4 py-3 text-cream">
                    {order.drink?.name_en ?? "—"}
                  </td>

                  <td className="px-4 py-3 text-cream-dim">
                    {order.branch?.name_en ?? "—"}
                  </td>

                  <td className="px-4 py-3">
                    <StatusPill s={order.status} />
                  </td>

                  <td className="px-4 py-3 text-end text-cream-dim">
                    {timeAgo(order.created_at)}
                  </td>
                </tr>
              ))}

              {!loading && recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-cream-dim"
                  >
                    {t("empty_orders")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function SubscriptionsTab() {
  const { t } = useI18n();

  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
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

    setRows((data ?? []) as unknown as SubscriptionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  return (
    <div className="panel min-w-0 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-cream">
          {t("all_subs")}
        </h2>

        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-caramel" />
        )}
      </div>

      <div className="engraved w-full overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="px-4 py-3 text-start">
                {t("col_phone")}
              </th>

              <th className="px-4 py-3 text-start">
                {t("col_customer")}
              </th>

              <th className="px-4 py-3 text-start">
                {t("col_plan")}
              </th>

              <th className="px-4 py-3 text-start">
                {t("col_branch")}
              </th>

              <th className="px-4 py-3 text-end">
                {t("col_status")}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[oklch(0.08_0.02_40)]"
              >
                <td className="px-4 py-3 font-mono text-cream">
                  {row.customer?.phone ?? "—"}
                </td>

                <td className="px-4 py-3 text-cream-dim">
                  {row.customer?.name ?? "—"}
                </td>

                <td className="px-4 py-3 text-cream">
                  {row.plan?.name ?? "—"}
                </td>

                <td className="px-4 py-3 text-cream-dim">
                  {row.branch?.name_en ?? "—"}
                </td>

                <td className="px-4 py-3 text-end">
                  <StatusPill s={row.status} />
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-cream-dim"
                >
                  {t("empty_subs")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BranchesTab() {
  const { t } = useI18n();

  const [rows, setRows] = useState<BranchRow[]>([]);
  const [form, setForm] = useState({
    name_en: "",
    name_ar: "",
    address_en: "",
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .order("name_en");

    setRows((data ?? []) as BranchRow[]);
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setMessage(null);

    const { error } = await supabase
      .from("branches")
      .insert({
        name_en: form.name_en.trim(),
        name_ar: form.name_ar.trim(),
        address_en: form.address_en.trim() || null,
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

    setMessage(t("btn_create"));
    await loadBranches();
  }

  return (
    <>
      <div className="panel-warm mb-6 min-w-0 p-4 sm:p-6">
        <h2 className="mb-4 font-display text-xl font-bold text-cream">
          {t("new_branch")}
        </h2>

        <form
          onSubmit={createBranch}
          className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <FieldInput
            label={`${t("f_name")} (EN)`}
            value={form.name_en}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                name_en: value,
              }));
            }}
            required
          />

          <FieldInput
            label={`${t("f_name")} (AR)`}
            value={form.name_ar}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                name_ar: value,
              }));
            }}
            required
          />

          <FieldInput
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
            className="btn-brass flex min-h-11 items-center justify-center gap-2 px-4 py-3"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {t("btn_create")}
          </button>
        </form>

        {message && (
          <div className="engraved mt-4 px-4 py-3 text-sm text-cream-dim">
            {message}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((branch) => (
          <article
            key={branch.id}
            className="panel min-w-0 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-xl font-bold text-cream">
                  {branch.name_en}
                </h3>

                <p className="mt-1 text-sm text-cream-dim">
                  {branch.address_en || "—"}
                </p>
              </div>

              <div className="engraved shrink-0 rounded-lg px-3 py-1.5 text-xs gold-text">
                {branch.name_ar}
              </div>
            </div>

            <div className="hairline-divider my-4" />

            <a
              href={`/scan?branch=${encodeURIComponent(branch.id)}`}
              className="btn-ghost-brass block w-full px-4 py-2.5 text-center text-xs"
            >
              {t("open_scan_link")}
            </a>
          </article>
        ))}

        {rows.length === 0 && (
          <div className="panel col-span-full p-8 text-center text-cream-dim">
            {t("empty_branches")}
          </div>
        )}
      </div>
    </>
  );
}

function StaffTab() {
  const { t } = useI18n();

  const [users, setUsers] = useState<StaffRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);

  const [form, setForm] = useState({
    user_id: "",
    role: "cashier",
    branch_id: "",
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    const [rolesResult, branchesResult] = await Promise.all([
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
      (rolesResult.data ?? []) as unknown as StaffRow[],
    );

    setBranches(
      (branchesResult.data ?? []) as BranchRow[],
    );
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setMessage(null);

    const { error } = await supabase
      .from("user_roles")
      .insert({
        user_id: form.user_id.trim(),
        role: form.role,
        branch_id: form.branch_id || null,
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

    setMessage(t("btn_assign"));
    await loadStaff();
  }

  return (
    <>
      <div className="panel-warm mb-6 min-w-0 p-4 sm:p-6">
        <h2 className="mb-2 font-display text-xl font-bold text-cream">
          {t("assign_role")}
        </h2>

        <p className="mb-4 text-xs leading-6 text-cream-dim">
          {t("assign_hint")}
        </p>

        <form
          onSubmit={assignRole}
          className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <FieldInput
            label={t("f_user_id")}
            value={form.user_id}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                user_id: value,
              }));
            }}
            required
          />

          <FieldSelect
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

          <FieldSelect
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
              ...branches.map((branch) => ({
                value: branch.id,
                label: branch.name_en,
              })),
            ]}
          />

          <button
            type="submit"
            disabled={busy}
            className="btn-brass flex min-h-11 items-center justify-center gap-2 px-4 py-3"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {t("btn_assign")}
          </button>
        </form>

        {message && (
          <div className="engraved mt-4 px-4 py-3 text-sm text-cream-dim">
            {message}
          </div>
        )}
      </div>

      <div className="panel min-w-0 p-4 sm:p-6">
        <h2 className="mb-4 font-display text-xl font-bold text-cream">
          {t("staff_members")}
        </h2>

        <div className="engraved w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-cream-dim">
                <th className="px-4 py-3 text-start">
                  {t("col_user_id")}
                </th>

                <th className="px-4 py-3 text-start">
                  {t("col_role")}
                </th>

                <th className="px-4 py-3 text-start">
                  {t("col_branch")}
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-[oklch(0.08_0.02_40)]"
                >
                  <td className="px-4 py-3 font-mono text-xs text-cream-dim">
                    {user.user_id}
                  </td>

                  <td className="px-4 py-3">
                    <StatusPill s={user.role} />
                  </td>

                  <td className="px-4 py-3 text-cream">
                    {user.branch?.name_en ?? "—"}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-cream-dim"
                  >
                    {t("empty_roles")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

type FieldInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
};

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: FieldInputProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-cream-dim">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60"
      />
    </label>
  );
}

type FieldSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
};

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: FieldSelectProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-cream-dim">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60"
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
