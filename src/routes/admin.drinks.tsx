import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Check,
  Coffee,
  Edit3,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
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
  image_url: string | null;
  image_path: string | null;
  created_at: string | null;
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

const DRINK_IMAGES_BUCKET =
  "drink-images";

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function AdminDrinksPage() {
  const [drinks, setDrinks] =
    useState<DrinkRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingDrink, setEditingDrink] =
    useState<DrinkRow | null>(null);

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
          `
            id,
            name_en,
            name_ar,
            is_active,
            image_url,
            image_path,
            created_at
          `,
        )
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        console.error(
          "Failed to load drinks:",
          queryError,
        );

        setError(
          queryError.message,
        );

        setDrinks([]);
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
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return drinks;
      }

      return drinks.filter(
        (drink) =>
          drink.name_en
            .toLowerCase()
            .includes(query) ||
          drink.name_ar
            .toLowerCase()
            .includes(query),
      );
    }, [
      drinks,
      search,
    ]);

  function openCreateModal() {
    setEditingDrink(null);
    setError(null);
    setMessage(null);
    setModalOpen(true);
  }

  function openEditModal(
    drink: DrinkRow,
  ) {
    setEditingDrink(drink);
    setError(null);
    setMessage(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDrink(null);
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
    setError(null);
    setMessage(null);

    if (drink.image_path) {
      const {
        error: storageError,
      } = await supabase.storage
        .from(
          DRINK_IMAGES_BUCKET,
        )
        .remove([
          drink.image_path,
        ]);

      if (storageError) {
        console.warn(
          "Could not remove drink image:",
          storageError,
        );
      }
    }

    const {
      error: deleteError,
    } = await supabase
      .from("drink_types")
      .delete()
      .eq("id", drink.id);

    setDeletingId(null);

    if (deleteError) {
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
            Add and manage drinks available to customers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="btn-brass flex items-center gap-2 px-5 py-2.5"
          >
            <Plus className="h-4 w-4" />

            <span>
              Add Drink
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="panel kob-content-card">
        <div className="kob-card-header flex-wrap">
          <div>
            <h2 className="kob-card-title">
              Available Drinks
            </h2>

            <p className="mt-1 text-xs text-cream-dim">
              Active drinks appear in the customer ordering flow.
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
          <div className="engraved flex min-h-72 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-caramel" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                    openEditModal(
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
              <div className="engraved col-span-full flex min-h-72 flex-col items-center justify-center p-8 text-center">
                <Coffee className="mb-4 h-10 w-10 text-caramel" />

                <p className="text-lg text-cream">
                  No drinks found.
                </p>

                <p
                  className="mt-1 text-sm text-cream-dim"
                  dir="rtl"
                >
                  لا توجد مشروبات
                </p>

                <button
                  type="button"
                  onClick={
                    openCreateModal
                  }
                  className="btn-brass mt-5 flex items-center gap-2 px-5 py-2.5"
                >
                  <Plus className="h-4 w-4" />

                  Add Drink
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {modalOpen && (
        <DrinkModal
          drink={editingDrink}
          onClose={closeModal}
          onSaved={async (
            savedDrink,
          ) => {
            closeModal();

            setMessage(
              editingDrink
                ? "Drink updated successfully."
                : "Drink added successfully.",
            );

            setDrinks(
              (current) => {
                const exists =
                  current.some(
                    (item) =>
                      item.id ===
                      savedDrink.id,
                  );

                if (exists) {
                  return current.map(
                    (item) =>
                      item.id ===
                      savedDrink.id
                        ? savedDrink
                        : item,
                  );
                }

                return [
                  savedDrink,
                  ...current,
                ];
              },
            );
          }}
        />
      )}
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
    <article className="panel-warm flex min-w-0 flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-black/25">
        {drink.image_url ? (
          <img
            src={drink.image_url}
            alt={drink.name_en}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-caramel/10 to-black/20">
            <Coffee className="h-12 w-12 text-caramel-bright" />

            <span className="mt-3 text-xs uppercase tracking-widest text-cream-dim">
              No image
            </span>
          </div>
        )}

        <span
          className={
            drink.is_active
              ? "absolute right-3 top-3 rounded-full border border-green-400/30 bg-green-900/75 px-3 py-1 text-xs font-medium text-green-100 backdrop-blur"
              : "absolute right-3 top-3 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-cream-dim backdrop-blur"
          }
        >
          {drink.is_active
            ? "Active"
            : "Inactive"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="min-w-0">
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
      </div>
    </article>
  );
}

type DrinkModalProps = {
  drink: DrinkRow | null;
  onClose: () => void;
  onSaved: (
    drink: DrinkRow,
  ) => void | Promise<void>;
};

function DrinkModal({
  drink,
  onClose,
  onSaved,
}: DrinkModalProps) {
  const [form, setForm] =
    useState<DrinkForm>({
      name_en:
        drink?.name_en ?? "",
      name_ar:
        drink?.name_ar ?? "",
      is_active:
        drink?.is_active ??
        true,
    });

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<string | null>(
    drink?.image_url ?? null,
  );

  const [removeImage, setRemoveImage] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  useEffect(() => {
    return () => {
      if (
        previewUrl &&
        previewUrl.startsWith(
          "blob:",
        )
      ) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  function handleImageChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      setError(
        "Only JPG, PNG, and WebP images are allowed.",
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      setError(
        "The image must be smaller than 5 MB.",
      );

      event.target.value = "";

      return;
    }

    if (
      previewUrl &&
      previewUrl.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    setImageFile(file);
    setPreviewUrl(objectUrl);
    setRemoveImage(false);
  }

  function clearImage() {
    if (
      previewUrl &&
      previewUrl.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    setImageFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nameEn =
      form.name_en.trim();

    const nameAr =
      form.name_ar.trim();

    if (!nameEn || !nameAr) {
      setError(
        "Enter the drink name in Arabic and English.",
      );

      return;
    }

    setSaving(true);
    setError(null);

    let imageUrl =
      removeImage
        ? null
        : drink?.image_url ??
          null;

    let imagePath =
      removeImage
        ? null
        : drink?.image_path ??
          null;

    let uploadedPath:
      | string
      | null = null;

    if (imageFile) {
      const extension =
        getFileExtension(
          imageFile,
        );

      uploadedPath =
        `drinks/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          DRINK_IMAGES_BUCKET,
        )
        .upload(
          uploadedPath,
          imageFile,
          {
            cacheControl:
              "3600",
            upsert: false,
            contentType:
              imageFile.type,
          },
        );

      if (uploadError) {
        setSaving(false);

        setError(
          uploadError.message,
        );

        return;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from(
          DRINK_IMAGES_BUCKET,
        )
        .getPublicUrl(
          uploadedPath,
        );

      imageUrl =
        publicUrlData.publicUrl;

      imagePath =
        uploadedPath;
    }

    let savedDrink:
      | DrinkRow
      | null = null;

    if (drink) {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("drink_types")
        .update({
          name_en: nameEn,
          name_ar: nameAr,
          is_active:
            form.is_active,
          image_url: imageUrl,
          image_path: imagePath,
        })
        .eq("id", drink.id)
        .select(
          `
            id,
            name_en,
            name_ar,
            is_active,
            image_url,
            image_path,
            created_at
          `,
        )
        .single();

      if (updateError) {
        if (uploadedPath) {
          await supabase.storage
            .from(
              DRINK_IMAGES_BUCKET,
            )
            .remove([
              uploadedPath,
            ]);
        }

        setSaving(false);

        setError(
          updateError.message,
        );

        return;
      }

      savedDrink =
        data as DrinkRow;

      const oldImagePath =
        drink.image_path;

      const shouldDeleteOldImage =
        oldImagePath &&
        oldImagePath !==
          imagePath;

      if (
        shouldDeleteOldImage
      ) {
        const {
          error:
            removeOldImageError,
        } =
          await supabase.storage
            .from(
              DRINK_IMAGES_BUCKET,
            )
            .remove([
              oldImagePath,
            ]);

        if (
          removeOldImageError
        ) {
          console.warn(
            "Could not delete old image:",
            removeOldImageError,
          );
        }
      }
    } else {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("drink_types")
        .insert({
          name_en: nameEn,
          name_ar: nameAr,
          is_active:
            form.is_active,
          image_url: imageUrl,
          image_path: imagePath,
        })
        .select(
          `
            id,
            name_en,
            name_ar,
            is_active,
            image_url,
            image_path,
            created_at
          `,
        )
        .single();

      if (insertError) {
        if (uploadedPath) {
          await supabase.storage
            .from(
              DRINK_IMAGES_BUCKET,
            )
            .remove([
              uploadedPath,
            ]);
        }

        setSaving(false);

        setError(
          insertError.message,
        );

        return;
      }

      savedDrink =
        data as DrinkRow;
    }

    setSaving(false);

    if (savedDrink) {
      await onSaved(
        savedDrink,
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="panel-warm max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-cream">
              {drink
                ? "Edit Drink"
                : "Add Drink"}
            </h2>

            <p className="mt-1 text-sm text-cream-dim">
              Add the Arabic and English names and upload a drink image.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-brass flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Drink name in English"
              value={
                form.name_en
              }
              placeholder="Example: Latte"
              required
              onChange={(
                value,
              ) => {
                setForm(
                  (current) => ({
                    ...current,
                    name_en:
                      value,
                  }),
                );
              }}
            />

            <FormInput
              label="اسم المشروب بالعربي"
              value={
                form.name_ar
              }
              placeholder="مثال: لاتيه"
              required
              dir="rtl"
              onChange={(
                value,
              ) => {
                setForm(
                  (current) => ({
                    ...current,
                    name_ar:
                      value,
                  }),
                );
              }}
            />
          </div>

          <div>
            <span className="kob-field-label">
              Drink Image
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleImageChange
              }
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-caramel/25 bg-black/20">
                <img
                  src={previewUrl}
                  alt="Drink preview"
                  className="aspect-[16/10] w-full object-cover"
                />

                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="btn-ghost-brass flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />

                    Change Image
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearImage
                    }
                    className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-950/70 px-4 py-2 text-sm text-red-100"
                  >
                    <Trash2 className="h-4 w-4" />

                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="engraved flex min-h-48 w-full flex-col items-center justify-center border border-dashed border-caramel/30 p-6 text-center transition hover:border-caramel/60 hover:bg-caramel/5"
              >
                <ImagePlus className="mb-3 h-10 w-10 text-caramel-bright" />

                <span className="font-semibold text-cream">
                  Choose image from device
                </span>

                <span className="mt-2 text-xs text-cream-dim">
                  JPG, PNG or WebP · Maximum 5 MB
                </span>
              </button>
            )}
          </div>

          <label className="block">
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
                  ? "flex min-h-12 w-full items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-100"
                  : "flex min-h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-cream-dim"
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
                      ? "absolute right-1 top-1 h-4 w-4 rounded-full bg-white"
                      : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white/70"
                  }
                />
              </span>
            </button>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-ghost-brass px-6 py-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-brass flex items-center justify-center gap-2 px-7 py-3"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : drink ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              <span>
                {drink
                  ? "Save Changes"
                  : "Add Drink"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
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
        maxLength={100}
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

function getFileExtension(
  file: File,
) {
  if (
    file.type ===
    "image/png"
  ) {
    return "png";
  }

  if (
    file.type ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}
