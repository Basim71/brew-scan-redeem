import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  Coffee,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/admin/drinks",
)({
  component: AdminDrinksPage,
});

type DrinkRow = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  created_at?: string | null;
};

type DrinkForm = {
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

const initialForm: DrinkForm = {
  name_en: "",
  name_ar: "",
  is_active: true,
};

function AdminDrinksPage() {
  const [drinks, setDrinks] =
    useState<DrinkRow[]>([]);

  const [form, setForm] =
    useState<DrinkForm>(initialForm);

  const [editingDrink, setEditingDrink] =
    useState<DrinkRow | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadDrinks =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      const {
        data,
        error: queryError,
      } = await supabase
        .from("drink_types")
        .select(
          "id,name_en,name_ar,is_active,created_at",
        )
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        console.error(
          "Failed to load drinks:",
          queryError,
        );

        setDrinks([]);
        setError(queryError.message);
        setLoading(false);

        return;
      }

      setDrinks(
        (data ?? []) as DrinkRow[],
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadDrinks();
  }, [loadDrinks]);

  const filteredDrinks =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return drinks;
      }

      return drinks.filter(
        (drink) =>
          drink.name_en
            .toLowerCase()
            .includes(value) ||
          drink.name_ar
            .toLowerCase()
            .includes(value),
      );
    }, [
      drinks,
      search,
    ]);

  const activeCount =
    drinks.filter(
      (drink) =>
        drink.is_active,
    ).length;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nameEn =
      form.name_en.trim();

    const nameAr =
      form.name_ar.trim();

    if (!nameEn || !nameAr) {
      setError(
        "Please enter the drink name in Arabic and English.",
      );

      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    if (editingDrink) {
      const {
        error: updateError,
      } = await supabase
        .from("drink_types")
        .update({
          name_en: nameEn,
          name_ar: nameAr,
          is_active:
            form.is_active,
        })
        .eq(
          "id",
          editingDrink.id,
        );

      setSaving(false);

      if (updateError) {
        console.error(
          "Failed to update drink:",
          updateError,
        );

        setError(
          updateError.message,
        );

        return;
      }

      setMessage(
        "Drink updated successfully.",
      );
    } else {
      const {
        error: insertError,
      } = await supabase
        .from("drink_types")
        .insert({
          name_en: nameEn,
          name_ar: nameAr,
          is_active:
            form.is_active,
        });

      setSaving(false);

      if (insertError) {
        console.error(
          "Failed to create drink:",
          insertError,
        );

        setError(
          insertError.message,
        );

        return;
      }

      setMessage(
        "Drink added successfully.",
      );
    }

    resetForm();
    await loadDrinks();
  }

  function startEditing(
    drink: DrinkRow,
  ) {
    setEditingDrink(drink);

    setForm({
      name_en: drink.name_en,
      name_ar: drink.name_ar,
      is_active:
        drink.is_active,
    });

    setMessage(null);
    setError(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingDrink(null);

    setForm({
      ...initialForm,
    });
  }

  async function toggleDrink(
    drink: DrinkRow,
  ) {
    setError(null);
    setMessage(null);

    const nextStatus =
      !drink.is_active;

    const {
      error: updateError,
    } = await supabase
      .from("drink_types")
      .update({
        is_active: nextStatus,
      })
      .eq("id", drink.id);

    if (updateError) {
      console.error(
        "Failed to change drink status:",
        updateError,
      );

      setError(
        updateError.message,
      );

      return;
    }

    setDrinks((current) =>
      current.map((item) =>
        item.id === drink.id
          ? {
              ...item,
              is_active:
                nextStatus,
            }
          : item,
      ),
    );

    setMessage(
      nextStatus
        ? "Drink activated successfully."
        : "Drink deactivated successfully.",
    );
  }

  async function deleteDrink(
    drink: DrinkRow,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${drink.name_en}"?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(drink.id);
    setMessage(null);
    setError(null);

    const {
      error: deleteError,
    } = await supabase
      .from("drink_types")
      .delete()
      .eq("id", drink.id);

    setDeletingId(null);

    if (deleteError) {
      console.error(
        "Failed to delete drink:",
        deleteError,
      );

      setError(
        deleteError.message,
      );

      return;
    }

    setDrinks((current) =>
      current.filter(
        (item) =>
          item.id !== drink.id,
      ),
    );

    if (
      editingDrink?.id ===
      drink.id
    ) {
      resetForm();
    }

    setMessage(
      "Drink deleted successfully.",
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            Drinks
          </h1>

          <p className="kob-page-description">
            Add and manage the drinks available to customers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadDrinks();
          }}
          disabled={loading}
          className="btn-ghost-brass flex items-center gap-2 px-4 py-2.5"
        >
          <RefreshCw
            className={
              loading
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          <span>
            Refresh
          </span>
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="panel-warm kob-stat-card">
          <div className="kob-stat-card-top">
            <span className="kob-stat-label">
              Total drinks
            </span>

            <span className="kob-stat-icon">
              <Coffee className="h-5 w-5" />
            </span>
          </div>

          <strong className="kob-stat-value">
            {drinks.length}
          </strong>
        </article>

        <article className="panel-warm kob-stat-card">
          <div className="kob-stat-card-top">
            <span className="kob-stat-label">
              Active drinks
            </span>

            <span className="kob-stat-icon">
              <Check className="h-5 w-5" />
            </span>
          </div>

          <strong className="kob-stat-value">
            {activeCount}
          </strong>
        </article>
      </div>

      <section className="panel-warm kob-content-card mb-6">
        <div className="kob-card-header">
          <div className="flex items-center gap-3">
            <span className="kob-stat-icon">
              {editingDrink ? (
                <Edit3 className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </span>

            <div>
              <h2 className="kob-card-title">
                {editingDrink
                  ? "Edit drink"
                  : "Add new drink"}
              </h2>

              {editingDrink && (
                <p className="mt-1 text-xs text-cream-dim">
                  Editing:{" "}
                  {editingDrink.name_en}
                </p>
              )}
            </div>
          </div>

          {editingDrink && (
            <button
              type="button"
              onClick={resetForm}
              className="btn-ghost-brass flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <X className="h-4 w-4" />

              <span>
                Cancel
              </span>
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_180px]"
        >
          <FormInput
            label="Drink name in English"
            value={form.name_en}
            placeholder="Example: Latte"
            required
            onChange={(value) => {
              setForm(
                (current) => ({
                  ...current,
                  name_en: value,
                }),
              );
            }}
          />

          <FormInput
            label="اسم المشروب بالعربي"
            value={form.name_ar}
            placeholder="مثال: لاتيه"
            required
            dir="rtl"
            onChange={(value) => {
              setForm(
                (current) => ({
                  ...current,
                  name_ar: value,
                }),
              );
            }}
          />

          <label className="block min-w-0">
            <span className="kob-field-label">
              Status
            </span>

            <button
              type="button"
              onClick={() => {
                setForm(
                  (current) => ({
                    ...current,
                    is_active:
                      !current.is_active,
                  }),
                );
              }}
              className={
                form.is_active
                  ? "flex min-h-11 w-full items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-green-200"
                  : "flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-cream-dim"
              }
            >
              <span>
                {form.is_active
                  ? "Active"
                  : "Inactive"}
              </span>

              <span
                className={
                  form.is_active
                    ? "relative h-6 w-11 rounded-full bg-green-500/60"
                    : "relative h-6 w-11 rounded-full bg-white/10"
                }
              >
                <span
                  className={
                    form.is_active
                      ? "absolute right-1 top-1 h-4 w-4 rounded-full bg-white transition"
                      : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white/70 transition"
                  }
                />
              </span>
            </button>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="btn-brass flex min-h-11 items-center justify-center gap-2 px-4 py-3"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingDrink ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            <span>
              {editingDrink
                ? "Save changes"
                : "Add drink"}
            </span>
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>

      <section className="panel kob-content-card">
        <div className="kob-card-header flex-wrap">
          <div>
            <h2 className="kob-card-title">
              Available drinks
            </h2>

            <p className="mt-1 text-xs text-cream-dim">
              Active drinks appear on the customer ordering page.
            </p>
          </div>

          <div className="inset-well flex min-w-0 items-center gap-2 px-3 py-2.5 sm:w-72">
            <Search className="h-4 w-4 shrink-0 text-cream-dim" />

            <input
              type="search"
              value={search}
              placeholder="Search drinks..."
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-cream-dim/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="engraved flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-caramel" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredDrinks.map(
              (drink) => (
                <DrinkCard
                  key={drink.id}
                  drink={drink}
                  deleting={
                    deletingId ===
                    drink.id
                  }
                  onEdit={() => {
                    startEditing(
                      drink,
                    );
                  }}
                  onToggle={() => {
                    void toggleDrink(
                      drink,
                    );
                  }}
                  onDelete={() => {
                    void deleteDrink(
                      drink,
                    );
                  }}
                />
              ),
            )}

            {filteredDrinks.length ===
              0 && (
              <div className="engraved col-span-full flex min-h-48 flex-col items-center justify-center p-8 text-center">
                <Coffee className="mb-3 h-8 w-8 text-caramel" />

                <p className="text-cream">
                  No drinks found.
                </p>

                <p
                  className="mt-1 text-sm text-cream-dim"
                  dir="rtl"
                >
                  لا توجد مشروبات
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type DrinkCardProps = {
  drink: DrinkRow;
  deleting: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

function DrinkCard({
  drink,
  deleting,
  onEdit,
  onToggle,
  onDelete,
}: DrinkCardProps) {
  return (
    <article className="panel-warm flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="kob-stat-icon">
          <Coffee className="h-5 w-5" />
        </span>

        <span
          className={
            drink.is_active
              ? "rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-200"
              : "rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-cream-dim"
          }
        >
          {drink.is_active
            ? "Active"
            : "Inactive"}
        </span>
      </div>

      <div className="mt-5 min-w-0">
        <h3 className="truncate font-display text-xl font-bold text-cream">
          {drink.name_en}
        </h3>

        <p
          className="mt-2 truncate text-base text-caramel"
          dir="rtl"
        >
          {drink.name_ar}
        </p>
      </div>

      <div className="hairline-divider my-5" />

      <button
        type="button"
        onClick={onToggle}
        className={
          drink.is_active
            ? "mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100 transition hover:bg-amber-500/20"
            : "mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-100 transition hover:bg-green-500/20"
        }
      >
        {drink.is_active ? (
          <X className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}

        <span>
          {drink.is_active
            ? "Deactivate"
            : "Activate"}
        </span>
      </button>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="btn-ghost-brass flex items-center justify-center gap-2 px-3 py-2.5 text-sm"
        >
          <Edit3 className="h-4 w-4" />

          <span>
            Edit
          </span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}

          <span>
            Delete
          </span>
        </button>
      </div>
    </article>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  onChange: (
    value: string,
  ) => void;
};

function FormInput({
  label,
  value,
  placeholder,
  required = false,
  dir = "ltr",
  onChange,
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
        dir={dir}
        placeholder={placeholder}
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
