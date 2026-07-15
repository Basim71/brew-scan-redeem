import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Coffee, Edit3, ImagePlus, Loader2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/drinks")({ component: AdminDrinksPage });

type SelectionType = "single" | "multiple";
type OptionDraft = { id?: string; name_en: string; name_ar: string; is_active: boolean };
type GroupDraft = { id?: string; name_en: string; name_ar: string; selection_type: SelectionType; is_required: boolean; options: OptionDraft[] };
type DrinkRow = {
  id: string; name_en: string; name_ar: string; is_active: boolean;
  image_url: string | null; image_path: string | null; calories: number | null;
  allergens: string[]; created_at: string | null;
  option_groups: Array<GroupDraft & { id: string }>;
};

const BUCKET = "drink-images";
const ALLERGENS = [
  ["milk", "Milk", "حليب", "🥛"], ["nuts", "Nuts", "مكسرات", "🥜"],
  ["coconut", "Coconut", "جوز الهند", "🥥"], ["soy", "Soy", "صويا", "🫘"],
  ["gluten", "Gluten", "غلوتين", "🌾"], ["egg", "Egg", "بيض", "🥚"],
] as const;

function AdminDrinksPage() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalDrink, setModalDrink] = useState<DrinkRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: queryError } = await supabase.from("drink_types").select(`
      id,name_en,name_ar,is_active,image_url,image_path,calories,allergens,created_at,
      option_groups:drink_option_groups(
        id,name_en,name_ar,selection_type,is_required,sort_order,
        options:drink_options(id,name_en,name_ar,is_active,sort_order)
      )
    `).order("created_at", { ascending: false });
    if (queryError) { setRows([]); setError(queryError.message); }
    else setRows((data ?? []) as unknown as DrinkRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name_en.toLowerCase().includes(q) || r.name_ar.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  async function toggle(row: DrinkRow) {
    const next = !row.is_active;
    const { error } = await supabase.from("drink_types").update({ is_active: next }).eq("id", row.id);
    if (error) return setError(error.message);
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, is_active: next } : item));
  }

  async function remove(row: DrinkRow) {
    if (!window.confirm(`Delete ${row.name_en}?`)) return;
    setDeletingId(row.id); setError(null);
    const { error } = await supabase.from("drink_types").delete().eq("id", row.id);
    if (!error && row.image_path) await supabase.storage.from(BUCKET).remove([row.image_path]);
    setDeletingId(null);
    if (error) return setError(error.message);
    setRows((current) => current.filter((item) => item.id !== row.id));
  }

  return <div className="w-full min-w-0">
    <div className="kob-page-header">
      <div><h1 className="kob-page-title">Drinks</h1><p className="kob-page-description">Manage drink images, nutrition, allergens, and customer options.</p></div>
      <div className="flex gap-3">
        <button className="btn-ghost-brass flex items-center gap-2 px-4 py-2.5" onClick={() => void load()}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}/>Refresh</button>
        <button className="btn-brass flex items-center gap-2 px-5 py-2.5" onClick={() => setModalDrink(null)}><Plus className="h-4 w-4"/>Add Drink</button>
      </div>
    </div>
    {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">{error}</div>}
    {message && <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-3 text-green-700">{message}</div>}
    <section className="panel kob-content-card">
      <div className="kob-card-header flex-wrap"><div><h2 className="kob-card-title">Available Drinks</h2></div><div className="inset-well flex items-center gap-2 px-3 py-2.5 sm:w-72"><Search className="h-4 w-4 text-cream-dim"/><input className="min-w-0 flex-1 bg-transparent outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drinks..."/></div></div>
      {loading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin"/></div> :
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((drink) => <article key={drink.id} className="panel-warm overflow-hidden">
          <div className="relative aspect-[4/3] bg-stone-100">{drink.image_url ? <img src={drink.image_url} alt={drink.name_en} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center"><Coffee className="h-12 w-12 text-caramel"/></div>}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1">{drink.calories != null && <span className="kob-admin-drink-badge">🔥 {drink.calories}</span>}{drink.allergens.slice(0,3).map((a) => <span key={a} className="kob-admin-drink-badge">{ALLERGENS.find((x)=>x[0]===a)?.[3] ?? "⚠️"}</span>)}</div>
          </div>
          <div className="p-5"><div className="flex justify-between gap-3"><div><h3 className="font-display text-xl font-bold text-cream">{drink.name_en}</h3><p className="mt-1 text-caramel" dir="rtl">{drink.name_ar}</p></div><span className={drink.is_active ? "kob-status-active" : "kob-status-inactive"}>{drink.is_active ? "Active" : "Inactive"}</span></div>
            <p className="mt-3 text-xs text-cream-dim">{drink.option_groups.length} option groups</p>
            <div className="mt-5 grid grid-cols-3 gap-2"><button className="btn-ghost-brass px-2 py-2 text-sm" onClick={() => void toggle(drink)}>{drink.is_active ? "Disable" : "Enable"}</button><button className="btn-ghost-brass flex items-center justify-center gap-1 px-2 py-2 text-sm" onClick={() => setModalDrink(drink)}><Edit3 className="h-4 w-4"/>Edit</button><button className="kob-danger-button flex items-center justify-center gap-1" disabled={deletingId === drink.id} onClick={() => void remove(drink)}>{deletingId === drink.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}</button></div>
          </div>
        </article>)}
      </div>}
    </section>
    {modalDrink !== undefined && <DrinkModal drink={modalDrink} onClose={() => setModalDrink(undefined)} onSaved={async () => { setModalDrink(undefined); setMessage("Drink saved successfully."); await load(); }}/>} 
  </div>;
}

function DrinkModal({ drink, onClose, onSaved }: { drink: DrinkRow | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [nameEn, setNameEn] = useState(drink?.name_en ?? "");
  const [nameAr, setNameAr] = useState(drink?.name_ar ?? "");
  const [calories, setCalories] = useState(drink?.calories?.toString() ?? "");
  const [allergens, setAllergens] = useState<string[]>(drink?.allergens ?? []);
  const [groups, setGroups] = useState<GroupDraft[]>(drink?.option_groups?.map((g) => ({ ...g, options: g.options ?? [] })) ?? []);
  const [active, setActive] = useState(drink?.is_active ?? true);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(drink?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function pickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return setError("Use an image smaller than 5 MB.");
    setImage(file); setPreview(URL.createObjectURL(file));
  }
  function addGroup() { setGroups((g) => [...g, { name_en: "", name_ar: "", selection_type: "single", is_required: false, options: [] }]); }
  function updateGroup(index: number, patch: Partial<GroupDraft>) { setGroups((g) => g.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  function removeGroup(index: number) { setGroups((g) => g.filter((_, i) => i !== index)); }
  function addOption(groupIndex: number) { setGroups((g) => g.map((group, i) => i === groupIndex ? { ...group, options: [...group.options, { name_en: "", name_ar: "", is_active: true }] } : group)); }
  function updateOption(gi: number, oi: number, patch: Partial<OptionDraft>) { setGroups((g) => g.map((group, i) => i === gi ? { ...group, options: group.options.map((o, j) => j === oi ? { ...o, ...patch } : o) } : group)); }
  function removeOption(gi: number, oi: number) { setGroups((g) => g.map((group, i) => i === gi ? { ...group, options: group.options.filter((_, j) => j !== oi) } : group)); }

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    if (!nameEn.trim() || !nameAr.trim()) { setSaving(false); return setError("Arabic and English names are required."); }
    if (groups.some((g) => !g.name_en.trim() || !g.name_ar.trim() || g.options.some((o) => !o.name_en.trim() || !o.name_ar.trim()))) { setSaving(false); return setError("Complete all option group and option names."); }
    let imageUrl = drink?.image_url ?? null; let imagePath = drink?.image_path ?? null; let uploadedPath: string | null = null;
    if (image) {
      const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = `drinks/${crypto.randomUUID()}.${ext}`;
      const uploaded = await supabase.storage.from(BUCKET).upload(uploadedPath, image, { contentType: image.type });
      if (uploaded.error) { setSaving(false); return setError(uploaded.error.message); }
      imagePath = uploadedPath; imageUrl = supabase.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }
    const payload = { name_en: nameEn.trim(), name_ar: nameAr.trim(), calories: calories ? Number(calories) : null, allergens, is_active: active, image_url: imageUrl, image_path: imagePath };
    const result = drink ? await supabase.from("drink_types").update(payload).eq("id", drink.id).select("id").single() : await supabase.from("drink_types").insert(payload).select("id").single();
    if (result.error || !result.data) { if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]); setSaving(false); return setError(result.error?.message ?? "Unable to save drink."); }
    const drinkId = result.data.id;
    if (drink) await supabase.from("drink_option_groups").delete().eq("drink_type_id", drinkId);
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      const insertedGroup = await supabase.from("drink_option_groups").insert({ drink_type_id: drinkId, name_en: group.name_en.trim(), name_ar: group.name_ar.trim(), selection_type: group.selection_type, is_required: group.is_required, sort_order: gi }).select("id").single();
      if (insertedGroup.error || !insertedGroup.data) { setSaving(false); return setError(insertedGroup.error?.message ?? "Unable to save options."); }
      if (group.options.length) {
        const optionsResult = await supabase.from("drink_options").insert(group.options.map((o, oi) => ({ group_id: insertedGroup.data.id, name_en: o.name_en.trim(), name_ar: o.name_ar.trim(), is_active: o.is_active, sort_order: oi })));
        if (optionsResult.error) { setSaving(false); return setError(optionsResult.error.message); }
      }
    }
    if (drink?.image_path && uploadedPath && drink.image_path !== uploadedPath) await supabase.storage.from(BUCKET).remove([drink.image_path]);
    setSaving(false); await onSaved();
  }

  return <div className="kob-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="kob-drink-editor-modal panel-warm">
      <div className="kob-modal-header"><div><h2>{drink ? "Edit Drink" : "Add Drink"}</h2><p>Nutrition, allergens, and order options.</p></div><button className="btn-ghost-brass h-10 w-10" onClick={onClose}><X className="mx-auto h-4 w-4"/></button></div>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2"><Input label="English name" value={nameEn} onChange={setNameEn}/><Input label="الاسم بالعربي" value={nameAr} onChange={setNameAr} dir="rtl"/><Input label="Calories (kcal)" value={calories} onChange={(v) => setCalories(v.replace(/\D/g, ""))} inputMode="numeric"/></div>
        <div><span className="kob-field-label">Drink image</span><input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage}/><button type="button" className="kob-image-picker" onClick={() => fileRef.current?.click()}>{preview ? <img src={preview} alt="Preview"/> : <><ImagePlus className="h-9 w-9"/><span>Choose image</span></>}</button></div>
        <div><span className="kob-field-label">Allergens</span><div className="kob-allergen-admin-grid">{ALLERGENS.map(([key,en,ar,icon]) => <label key={key} className={allergens.includes(key) ? "kob-allergen-admin-item active" : "kob-allergen-admin-item"}><input type="checkbox" checked={allergens.includes(key)} onChange={() => setAllergens((a) => a.includes(key) ? a.filter((x)=>x!==key) : [...a,key])}/><span>{icon}</span><span>{en}<small>{ar}</small></span></label>)}</div></div>
        <div className="kob-option-editor"><div className="flex items-center justify-between"><div><h3>Drink Options</h3><p>Sugar, milk, and any configurable additions.</p></div><button type="button" className="btn-ghost-brass flex items-center gap-2 px-4 py-2" onClick={addGroup}><Plus className="h-4 w-4"/>Add Group</button></div>
          <div className="space-y-4">{groups.map((group, gi) => <div key={gi} className="kob-option-editor-group">
            <div className="grid gap-3 md:grid-cols-2"><Input label="Group name EN" value={group.name_en} onChange={(v)=>updateGroup(gi,{name_en:v})}/><Input label="اسم المجموعة" value={group.name_ar} onChange={(v)=>updateGroup(gi,{name_ar:v})} dir="rtl"/></div>
            <div className="mt-3 flex flex-wrap gap-3"><select className="inset-well px-3 py-2" value={group.selection_type} onChange={(e)=>updateGroup(gi,{selection_type:e.target.value as SelectionType})}><option value="single">Single choice</option><option value="multiple">Multiple choice</option></select><label className="kob-inline-check"><input type="checkbox" checked={group.is_required} onChange={(e)=>updateGroup(gi,{is_required:e.target.checked})}/>Required</label><button type="button" className="kob-text-danger" onClick={()=>removeGroup(gi)}>Remove group</button></div>
            <div className="mt-4 space-y-2">{group.options.map((option, oi) => <div key={oi} className="kob-option-row"><input className="inset-well" placeholder="Option EN" value={option.name_en} onChange={(e)=>updateOption(gi,oi,{name_en:e.target.value})}/><input className="inset-well" dir="rtl" placeholder="الخيار بالعربي" value={option.name_ar} onChange={(e)=>updateOption(gi,oi,{name_ar:e.target.value})}/><button type="button" className="kob-icon-danger" onClick={()=>removeOption(gi,oi)}><X className="h-4 w-4"/></button></div>)}<button type="button" className="kob-add-option" onClick={()=>addOption(gi)}><Plus className="h-4 w-4"/>Add option</button></div>
          </div>)}</div>
        </div>
        <label className="kob-inline-check"><input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)}/>Active and visible to customers</label>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-3"><button type="button" className="btn-ghost-brass px-6 py-3" onClick={onClose}>Cancel</button><button className="btn-brass flex items-center gap-2 px-7 py-3" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}Save Drink</button></div>
      </form>
    </section>
  </div>;
}

function Input({ label, value, onChange, dir, inputMode }: { label: string; value: string; onChange: (value:string)=>void; dir?: "rtl"|"ltr"; inputMode?: "numeric" }) {
  return <label className="block"><span className="kob-field-label">{label}</span><input className="inset-well kob-field-control" value={value} onChange={(e)=>onChange(e.target.value)} dir={dir} inputMode={inputMode}/></label>;
}
