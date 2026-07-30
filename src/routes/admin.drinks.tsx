import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Coffee, LayoutGrid, List, Plus, Search } from "lucide-react";
import { toast } from "sonner";

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

  async function load() {
    setLoading(true);
    try {
      setDrinks(await listStudioDrinks());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load drinks.");
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

  async function toggle(drink: DrinkRecord) {
    try {
      await setDrinkActive(drink.id, !drink.is_active);
      toast.success(drink.is_active ? "Drink disabled." : "Drink enabled.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  }

  async function duplicate(drink: DrinkRecord) {
    try {
      await duplicateDrink(drink);
      toast.success("Drink duplicated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplicate failed.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteDrink(pendingDelete);
      toast.success("Drink deleted.");
      setPendingDelete(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
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
        <label className="ds-search">
          <Search className="h-4 w-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drinks..." />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {DRINK_CATEGORIES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as DrinkStatusFilter)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as DrinkSortKey)} aria-label="Sort">
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="calories">Calories</option>
        </select>
        <div className="ds-view-toggle">
          <button type="button" data-active={view === "grid"} onClick={() => setView("grid")} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" data-active={view === "list"} onClick={() => setView("list")} aria-label="List view">
            <List className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className="btn-brass px-5 py-2.5" onClick={() => setWizard({ updatedAt: null })}>
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {loading ? (
        <div className="ds-tile-grid" data-view={view}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="ds-tile-skeleton" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="company-empty">
          <Coffee className="h-6 w-6" />
          <p>No drinks match these filters yet.</p>
        </div>
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
            toast.success(message);
            setWizard(null);
            await load();
          }}
        />
      )}

      {preview && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
          <section className="ds-preview-modal" role="dialog" aria-modal="true" aria-label="Drink preview">
            <header>
              <h2>Customer preview</h2>
              <button type="button" className="ds-icon-button" onClick={() => setPreview(null)} aria-label="Close">
                ×
              </button>
            </header>
            <LivePreview draft={preview} />
          </section>
        </div>
      )}

      {pendingDelete && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPendingDelete(null)}>
          <section className="ds-confirm" role="alertdialog" aria-modal="true">
            <h2>Delete {pendingDelete.name_en}?</h2>
            <p>This removes the drink and its option groups permanently.</p>
            <div className="ds-confirm-actions">
              <button type="button" className="btn-ghost-brass px-5 py-2.5" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="ds-danger-button" onClick={() => void confirmDelete()}>
                Delete drink
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
