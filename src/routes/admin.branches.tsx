import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Building2,
  ExternalLink,
  Loader2,
  Plus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute(
  "/admin/branches",
)({
  component: AdminBranchesPage,
});

type BranchRow = {
  id: string;
  name_en: string;
  name_ar: string;
  address_en?: string | null;
  address_ar?: string | null;
  created_at?: string | null;
};

function AdminBranchesPage() {
  const { t } = useI18n();

  const [rows, setRows] =
    useState<BranchRow[]>([]);

  const [form, setForm] = useState({
    name_en: "",
    name_ar: "",
    address_en: "",
  });

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadBranches =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } =
        await supabase
          .from("branches")
          .select("*")
          .order("name_en");

      if (queryError) {
        setError(queryError.message);
        setRows([]);
        setLoading(false);

        return;
      }

      setRows(
        (data ?? []) as BranchRow[],
      );

      setLoading(false);
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
    setError(null);

    const { error: insertError } =
      await supabase
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

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({
      name_en: "",
      name_ar: "",
      address_en: "",
    });

    setMessage(
      t("btn_create"),
    );

    await loadBranches();
  }

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            {t("tab_branches")}
          </h1>

          <p className="kob-page-description">
            {t("new_branch")}
          </p>
        </div>
      </div>

      <section className="panel-warm kob-content-card mb-6">
        <div className="kob-card-header">
          <div className="flex items-center gap-3">
            <span className="kob-stat-icon">
              <Building2 className="h-5 w-5" />
            </span>

            <h2 className="kob-card-title">
              {t("new_branch")}
            </h2>
          </div>
        </div>

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

      {loading ? (
        <div className="panel flex min-h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-caramel" />
        </div>
      ) : (
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

                  <p
                    className="mt-1 text-sm text-caramel"
                    dir="rtl"
                  >
                    {branch.name_ar}
                  </p>

                  <p className="mt-3 text-sm text-cream-dim">
                    {branch.address_en || "—"}
                  </p>
                </div>

                <span className="kob-stat-icon">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>

              <div className="hairline-divider my-5" />

              <a
                href={`/scan?branch=${encodeURIComponent(branch.id)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost-brass flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
              >
                <ExternalLink className="h-4 w-4" />

                <span>
                  {t("open_scan_link")}
                </span>
              </a>
            </article>
          ))}

          {rows.length === 0 && (
            <div className="panel col-span-full p-10 text-center text-cream-dim">
              {t("empty_branches")}
            </div>
          )}
        </div>
      )}
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
