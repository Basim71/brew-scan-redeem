import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Loader2,
  Plus,
  UserRoundCog,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { StatusPill } from "@/lib/ui";

export const Route = createFileRoute(
  "/admin/cashiers",
)({
  component: AdminCashiersPage,
});

type BranchRow = {
  id: string;
  name_en: string;
  name_ar?: string | null;
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

function AdminCashiersPage() {
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

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadStaff =
    useCallback(async () => {
      setLoading(true);
      setError(null);

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
          .select("id,name_en,name_ar")
          .order("name_en"),
      ]);

      if (rolesResult.error) {
        setError(
          rolesResult.error.message,
        );
      }

      if (branchesResult.error) {
        setError(
          branchesResult.error.message,
        );
      }

      setUsers(
        (rolesResult.data ??
          []) as unknown as StaffRow[],
      );

      setBranches(
        (branchesResult.data ??
          []) as BranchRow[],
      );

      setLoading(false);
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
    setError(null);

    const { error: insertError } =
      await supabase
        .from("user_roles")
        .insert({
          user_id:
            form.user_id.trim(),

          role:
            form.role as
              | "admin"
              | "cashier",

          branch_id:
            form.role === "cashier"
              ? form.branch_id || null
              : null,
        });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({
      user_id: "",
      role: "cashier",
      branch_id: "",
    });

    setMessage(
      t("btn_assign"),
    );

    await loadStaff();
  }

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            {t("tab_staff")}
          </h1>

          <p className="kob-page-description">
            {t("assign_hint")}
          </p>
        </div>
      </div>

      <section className="panel-warm kob-content-card mb-6">
        <div className="kob-card-header">
          <div className="flex items-center gap-3">
            <span className="kob-stat-icon">
              <UserRoundCog className="h-5 w-5" />
            </span>

            <h2 className="kob-card-title">
              {t("assign_role")}
            </h2>
          </div>
        </div>

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
            disabled={
              form.role !== "cashier"
            }
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
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>

      <section className="panel kob-content-card">
        <div className="kob-card-header">
          <div>
            <h2 className="kob-card-title">
              {t("staff_members")}
            </h2>

            <p className="mt-1 text-xs text-cream-dim">
              {users.length} records
            </p>
          </div>

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-caramel" />
          )}
        </div>

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
                    {user.branch?.name_en ?? "—"}
                  </td>
                </tr>
              ))}

              {!loading &&
                users.length === 0 && (
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
    </div>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function FormInput({
  label,
  value,
  onChange,
  required = false,
}: FormInputProps) {
  return (
    <label className="block min-w-0">
      <span className="kob-field-label">
        {label}
      </span>

      <input
        type="text"
        value={value}
        required={required}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="inset-well kob-field-control"
      />
    </label>
  );
}

type FormSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;

  options: Array<{
    value: string;
    label: string;
  }>;
};

function FormSelect({
  label,
  value,
  onChange,
  disabled = false,
  options,
}: FormSelectProps) {
  return (
    <label className="block min-w-0">
      <span className="kob-field-label">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="inset-well kob-field-control disabled:cursor-not-allowed disabled:opacity-50"
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
