import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Coffee, LayoutGrid, List, Plus } from "lucide-react";

import {
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  kobToast,
  Modal,
  NoResultsState,
  SearchInput,
  Select,
  SkeletonCard,
} from "@/components/kob";
import { useI18n } from "@/lib/i18n";
import { DrinkTile } from "@/features/company/drinks/DrinkTile";
import { DRINK_CATEGORIES } from "@/features/company/drinks/constants";
import {
  deleteDrink,
  draftFromRecord,
  duplicateDrink,
  listStudioDrinks,
  setDrinkActive,
} from "@/features/company/drinks/service";
import type {
  DrinkDraft,
  DrinkRecord,
  DrinkSortKey,
  DrinkStatusFilter,
  DrinkViewMode,
} from "@/features/company/drinks/types";
import { DrinkWizard } from "@/features/company/drinks/wizard/DrinkWizard";
import { LivePreview } from "@/features/company/drinks/wizard/LivePreview";

export const Route = createFileRoute("/admin/drinks")({
  head: () => ({
    meta: [
      { title: "Drink Studio — KOB" },
      { name: "description", content: "Design, publish and manage the KOB drink menu with a guided studio workflow." },
      { property: "og:title", content: "Drink Studio — KOB" },
      { property: "og:description", content: "Design, publish and manage the KOB drink menu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DrinkStudioPage,
});

function DrinkStudioPage() {
  const { t, lang } = useI18n();
  const [drinks, setDrinks] = useState<DrinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<DrinkStatusFilter>("all");
  const [sort, setSort] = useState<DrinkSortKey>("recent");
  const [view, setView] = useState<DrinkViewMode>("grid");
  const [wizard, setWizard] = useState<{ draft?: DrinkDraft; updatedAt: string | null } | null>(null);
  const [preview, setPreview] = useState<DrinkDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DrinkRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setDrinks(await listStudioDrinks());
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : t("drinks.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = drinks.filter((drink) => {
      if (term && !`${drink.name_en} ${drink.name_ar}`.toLowerCase().includes(term)) return false;
      if (status === "active" && !drink.is_active) return false;
      if (status === "inactive" && drink.is_active) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name_en.localeCompare(b.name_en);
      if (sort === "calories") return (b.calories ?? 0) - (a.calories ?? 0);
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  }, [drinks, search, status, sort]);

  const hasFilters = search.trim() !== "" || category !== "all" || status !== "all";

  async function toggle(drink: DrinkRecord) {
    try {
      await setDrinkActive(drink.id, !drink.is_active);
      kobToast.success(drink.is_active ? t("drinks.disabled") : t("drinks.enabled"));
      await load();
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : t("drinks.updateFailed"));
    }
  }

  async function duplicate(drink: DrinkRecord) {
    try {
      await duplicateDrink(drink);
      kobToast.success(t("drinks.duplicated"));
      await load();
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : t("drinks.duplicateFailed"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteDrink(pendingDelete);
      kobToast.success(t("drinks.deleted"));
      setPendingDelete(null);
      await load();
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : t("drinks.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="company-page ds-page">
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{t("drinks.kicker")}</span>
          <h1>{t("drinks.title")}</h1>
          <p>{t("drinks.subtitle")}</p>
        </div>
      </header>

      <div className="ds-toolbar">
        <SearchInput value={search} onValueChange={setSearch} placeholder={t("drinks.search")} className="ds-search" />
        <Select aria-label={t("drinks.category")} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{t("drinks.allCategories")}</option>
          {DRINK_CATEGORIES.map((item) => (
            <option key={item.key} value={item.key}>
              {t(`drinks.cat.${item.key}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("drinks.status")} value={status} onChange={(e) => setStatus(e.target.value as DrinkStatusFilter)}>
          <option value="all">{t("drinks.allStatuses")}</option>
          <option value="active">{t("drinks.active")}</option>
          <option value="inactive">{t("drinks.inactive")}</option>
        </Select>
        <Select aria-label={t("drinks.sort")} value={sort} onChange={(e) => setSort(e.target.value as DrinkSortKey)}>
          <option value="recent">{t("drinks.newest")}</option>
          <option value="name">{t("drinks.nameAZ")}</option>
          <option value="calories">{t("drinks.calories")}</option>
        </Select>
        <div className="ds-view-toggle">
          <IconButton
            label={t("drinks.gridView")}
            variant={view === "grid" ? "secondary" : "ghost"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={t("drinks.listView")}
            variant={view === "list" ? "secondary" : "ghost"}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </IconButton>
        </div>
        <Button variant="gold" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setWizard({ updatedAt: null })}>
          {t("drinks.add")}
        </Button>
      </div>

      {loading ? (
        <div className="ds-tile-grid" data-view={view}>
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} lines={2} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        hasFilters ? (
          <NoResultsState description={t("drinks.noResults")} />
        ) : (
          <EmptyState icon={<Coffee className="h-6 w-6" />} description={t("drinks.empty")} />
        )
      ) : (
        <div className="ds-tile-grid" data-view={view}>
          {visible.map((drink) => (
            <DrinkTile
              key={drink.id}
              drink={drink}
              view={view}
              onPreview={() => setPreview(draftFromRecord(drink))}
              onEdit={() => setWizard({ draft: draftFromRecord(drink), updatedAt: drink.created_at })}
              onToggle={() => void toggle(drink)}
              onDuplicate={() => void duplicate(drink)}
              onDelete={() => setPendingDelete(drink)}
            />
          ))}
        </div>
      )}

      {wizard && (
        <DrinkWizard
          initialDraft={wizard.draft}
          lastUpdated={wizard.updatedAt}
          onClose={() => setWizard(null)}
          onSaved={async (message) => {
            kobToast.success(message);
            setWizard(null);
            await load();
          }}
        />
      )}

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={t("drinks.customerPreview")} size="md">
        {preview && <LivePreview draft={preview} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t("drinks.deleteTitle", { name: (lang === "ar" ? pendingDelete?.name_ar : pendingDelete?.name_en) ?? t("drinks.thisDrink") })}
        description={t("drinks.deleteBody")}
        confirmLabel={t("drinks.deleteConfirm")}
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
