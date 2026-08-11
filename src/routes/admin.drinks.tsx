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
      kobToast.error(error instanceof Error ? error.message : "Unable to load drinks.");
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
      kobToast.success(drink.is_active ? "Drink disabled." : "Drink enabled.");
      await load();
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : "Update failed.");
    }
  }

  async function duplicate(drink: DrinkRecord) {
    try {
      await duplicateDrink(drink);
      kobToast.success("Drink duplicated.");
      await load();
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : "Duplicate failed.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteDrink(pendingDelete);
      kobToast.success("Drink deleted.");
      setPendingDelete(null);
      await load();
    } catch (error) {
      kobToast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="company-page ds-page">
      <header className="company-page-header">
        <div>
          <span className="company-kicker">Menu</span>
          <h1>Drink Studio</h1>
          <p>Craft every drink customers can order — identity, imagery, nutrition and options.</p>
        </div>
      </header>

      <div className="ds-toolbar">
        <SearchInput value={search} onValueChange={setSearch} placeholder="Search drinks..." className="ds-search" />
        <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {DRINK_CATEGORIES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as DrinkStatusFilter)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as DrinkSortKey)}>
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="calories">Calories</option>
        </Select>
        <div className="ds-view-toggle">
          <IconButton
            label="Grid view"
            variant={view === "grid" ? "secondary" : "ghost"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="List view"
            variant={view === "list" ? "secondary" : "ghost"}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </IconButton>
        </div>
        <Button variant="gold" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setWizard({ updatedAt: null })}>
          Add
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
          <NoResultsState description="No drinks match these filters yet." />
        ) : (
          <EmptyState icon={<Coffee className="h-6 w-6" />} description="No drinks yet — start by adding one." />
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

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Customer preview" size="md">
        {preview && <LivePreview draft={preview} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name_en ?? "this drink"}?`}
        description="This removes the drink and its option groups permanently."
        confirmLabel="Delete drink"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
