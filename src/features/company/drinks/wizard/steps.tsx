import { useRef, useState, type DragEvent } from "react";
import { Check, Copy, GripVertical, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { ALLERGEN_CARDS, DRINK_CATEGORIES, GROUP_TEMPLATES, newKey } from "../constants";
import type { DrinkDraft, GroupDraft, IntensityLevel, TemperatureMode } from "../types";
import { LivePreview } from "./LivePreview";

type StepProps = {
  draft: DrinkDraft;
  patch: (value: Partial<DrinkDraft>) => void;
};

function Pills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ key: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ds-pills">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className="ds-pill"
          data-active={value === option.key ? "true" : "false"}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const INTENSITY: Array<{ key: IntensityLevel; label: string }> = [
  { key: "none", label: "None" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

export function IdentityStep({ draft, patch }: StepProps) {
  return (
    <div className="ds-step">
      <div className="ds-grid-2">
        <label className="ds-field">
          <span>English name</span>
          <input
            value={draft.name_en}
            onChange={(e) => patch({ name_en: e.target.value })}
            placeholder="Enter English name"
          />
        </label>
        <label className="ds-field ds-field-rtl" dir="rtl">
          <span>الاسم بالعربية</span>
          <input
            dir="rtl"
            value={draft.name_ar}
            onChange={(e) => patch({ name_ar: e.target.value })}
            placeholder="أدخل الاسم بالعربية"
          />
        </label>
      </div>
      <div className="ds-field">
        <span>Category</span>
        <Pills
          value={draft.category}
          options={DRINK_CATEGORIES.map((category) => ({ key: category.key as string, label: category.label }))}
          onChange={(category) => patch({ category })}
        />
      </div>
      <div className="ds-field">
        <span>Status</span>
        <Pills
          value={draft.is_active ? "active" : "inactive"}
          options={[
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" },
          ]}
          onChange={(value) => patch({ is_active: value === "active" })}
        />
      </div>
    </div>
  );
}

export function VisualStep({
  draft,
  patch,
  onPickFile,
  uploading,
}: StepProps & { onPickFile: (file: File) => void; uploading: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onPickFile(file);
  }

  return (
    <div className="ds-step">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
          e.target.value = "";
        }}
      />
      <div
        className="ds-dropzone"
        data-dragging={dragging ? "true" : "false"}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <ImagePlus className="h-8 w-8" />
        <strong>{uploading ? "Uploading image…" : "Drag & drop an image"}</strong>
        <p>PNG, JPG or WEBP up to 5 MB</p>
        <button type="button" className="btn-ghost-brass px-4 py-2" onClick={() => inputRef.current?.click()}>
          Choose image
        </button>
      </div>

      {draft.image_url && (
        <div className="ds-image-tools">
          <label className="ds-field">
            <span>Crop / zoom</span>
            <input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={draft.image_zoom}
              onChange={(e) => patch({ image_zoom: Number(e.target.value) })}
            />
          </label>
          <label className="ds-field">
            <span>Reposition horizontally</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.image_offset.x}
              onChange={(e) => patch({ image_offset: { ...draft.image_offset, x: Number(e.target.value) } })}
            />
          </label>
          <label className="ds-field">
            <span>Reposition vertically</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.image_offset.y}
              onChange={(e) => patch({ image_offset: { ...draft.image_offset, y: Number(e.target.value) } })}
            />
          </label>
          <div className="ds-inline-actions">
            <button type="button" className="btn-ghost-brass px-4 py-2" onClick={() => inputRef.current?.click()}>
              Replace image
            </button>
            <button
              type="button"
              className="ds-text-danger"
              onClick={() => patch({ image_url: null, image_path: null })}
            >
              Remove image
            </button>
          </div>
        </div>
      )}

      <div className="ds-inline-preview">
        <LivePreview draft={draft} compact />
      </div>
    </div>
  );
}

export function NutritionStep({ draft, patch }: StepProps) {
  return (
    <div className="ds-step">
      <div className="ds-grid-2">
        <label className="ds-field">
          <span>Calories (kcal)</span>
          <input
            inputMode="numeric"
            value={draft.calories}
            onChange={(e) => patch({ calories: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="120"
          />
        </label>
        <div className="ds-field">
          <span>Serving size</span>
          <Pills
            value={draft.serving_size}
            options={[
              { key: "small", label: "Small" },
              { key: "medium", label: "Medium" },
              { key: "large", label: "Large" },
            ]}
            onChange={(serving_size) => patch({ serving_size })}
          />
        </div>
      </div>
      <div className="ds-field">
        <span>Served</span>
        <Pills<TemperatureMode>
          value={draft.temperature}
          options={[
            { key: "hot", label: "Hot" },
            { key: "cold", label: "Cold" },
            { key: "both", label: "Both" },
          ]}
          onChange={(temperature) => patch({ temperature })}
        />
      </div>
      <div className="ds-grid-2">
        <div className="ds-field">
          <span>Caffeine level</span>
          <Pills<IntensityLevel>
            value={draft.caffeine}
            options={INTENSITY}
            onChange={(caffeine) => patch({ caffeine })}
          />
        </div>
        <div className="ds-field">
          <span>Sugar level</span>
          <Pills<IntensityLevel> value={draft.sugar} options={INTENSITY} onChange={(sugar) => patch({ sugar })} />
        </div>
      </div>
      <p className="ds-hint">
        Serving, temperature, caffeine and sugar guide your team — only calories are stored on the drink record.
      </p>
    </div>
  );
}

export function AllergensStep({ draft, patch }: StepProps) {
  const none = draft.allergens.length === 0;
  function toggle(key: string) {
    patch({
      allergens: draft.allergens.includes(key)
        ? draft.allergens.filter((item) => item !== key)
        : [...draft.allergens, key],
    });
  }
  return (
    <div className="ds-step">
      <div className="ds-allergen-grid">
        <button
          type="button"
          className="ds-allergen-card"
          data-active={none ? "true" : "false"}
          onClick={() => patch({ allergens: [] })}
        >
          <span className="ds-allergen-icon">🚫</span>
          <strong>No Allergens</strong>
          <small dir="rtl">بدون مسببات حساسية</small>
          {none && <Check className="ds-allergen-check h-4 w-4" />}
        </button>
        {ALLERGEN_CARDS.map((card) => {
          const active = draft.allergens.includes(card.key);
          return (
            <button
              key={card.key}
              type="button"
              className="ds-allergen-card"
              data-active={active ? "true" : "false"}
              onClick={() => toggle(card.key)}
            >
              <span className="ds-allergen-icon">{card.icon}</span>
              <strong>{card.en}</strong>
              <small dir="rtl">{card.ar}</small>
              {active && <Check className="ds-allergen-check h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OptionsStep({ draft, patch }: StepProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function setGroups(groups: GroupDraft[]) {
    patch({ groups });
  }
  function updateGroup(index: number, value: Partial<GroupDraft>) {
    setGroups(draft.groups.map((group, i) => (i === index ? { ...group, ...value } : group)));
  }
  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...draft.groups];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setGroups(next);
  }

  return (
    <div className="ds-step">
      <div className="ds-template-grid">
        {GROUP_TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            className="ds-template"
            onClick={() => setGroups([...draft.groups, template.build()])}
          >
            <span>{template.icon}</span>
            <strong>{template.label_en}</strong>
            <small dir="rtl">{template.label_ar}</small>
          </button>
        ))}
      </div>

      <div className="ds-group-list">
        {draft.groups.map((group, index) => (
          <div
            key={group.key}
            className="ds-group"
            data-disabled={group.is_enabled ? "false" : "true"}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
          >
            <div className="ds-group-head">
              <GripVertical className="ds-drag h-4 w-4" />
              <input
                className="ds-group-name"
                value={group.name_en}
                placeholder="Group name (EN)"
                onChange={(e) => updateGroup(index, { name_en: e.target.value })}
              />
              <input
                className="ds-group-name"
                dir="rtl"
                value={group.name_ar}
                placeholder="اسم المجموعة"
                onChange={(e) => updateGroup(index, { name_ar: e.target.value })}
              />
              <div className="ds-group-actions">
                <button
                  type="button"
                  title="Duplicate"
                  onClick={() =>
                    setGroups([
                      ...draft.groups.slice(0, index + 1),
                      {
                        ...group,
                        key: newKey(),
                        options: group.options.map((option) => ({ ...option, key: newKey() })),
                      },
                      ...draft.groups.slice(index + 1),
                    ])
                  }
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  className="ds-text-danger"
                  onClick={() => setGroups(draft.groups.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="ds-group-toggles">
              <Pills
                value={group.selection_type}
                options={[
                  { key: "single", label: "Single select" },
                  { key: "multiple", label: "Multi select" },
                ]}
                onChange={(selection_type) => updateGroup(index, { selection_type })}
              />
              <Pills
                value={group.is_required ? "required" : "optional"}
                options={[
                  { key: "required", label: "Required" },
                  { key: "optional", label: "Optional" },
                ]}
                onChange={(value) => updateGroup(index, { is_required: value === "required" })}
              />
              <Pills
                value={group.is_enabled ? "enabled" : "disabled"}
                options={[
                  { key: "enabled", label: "Enabled" },
                  { key: "disabled", label: "Disabled" },
                ]}
                onChange={(value) => updateGroup(index, { is_enabled: value === "enabled" })}
              />
            </div>

            <div className="ds-option-rows">
              {group.options.map((option, optionIndex) => (
                <div key={option.key} className="ds-option-row">
                  <input
                    value={option.name_en}
                    placeholder="Option (EN)"
                    onChange={(e) =>
                      updateGroup(index, {
                        options: group.options.map((item, i) =>
                          i === optionIndex ? { ...item, name_en: e.target.value } : item,
                        ),
                      })
                    }
                  />
                  <input
                    dir="rtl"
                    value={option.name_ar}
                    placeholder="الخيار"
                    onChange={(e) =>
                      updateGroup(index, {
                        options: group.options.map((item, i) =>
                          i === optionIndex ? { ...item, name_ar: e.target.value } : item,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="ds-default-toggle"
                    data-active={option.is_default ? "true" : "false"}
                    title="Default option"
                    onClick={() =>
                      updateGroup(index, {
                        options: group.options.map((item, i) => ({
                          ...item,
                          is_default:
                            group.selection_type === "single"
                              ? i === optionIndex && !item.is_default
                              : i === optionIndex
                                ? !item.is_default
                                : item.is_default,
                        })),
                      })
                    }
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    className="ds-icon-danger"
                    title="Remove option"
                    onClick={() => updateGroup(index, { options: group.options.filter((_, i) => i !== optionIndex) })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="ds-add-option"
                onClick={() =>
                  updateGroup(index, {
                    options: [
                      ...group.options,
                      { key: newKey(), name_en: "", name_ar: "", is_active: true, is_default: false },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add option
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewStep({ draft }: { draft: DrinkDraft }) {
  const checklist = [
    { label: "English name", ok: Boolean(draft.name_en.trim()) },
    { label: "Arabic name", ok: Boolean(draft.name_ar.trim()) },
    { label: "Image", ok: Boolean(draft.image_url) },
    { label: "Calories", ok: Boolean(draft.calories) },
    { label: "Allergens", ok: draft.allergens.length > 0 },
    { label: "Options", ok: draft.groups.some((group) => group.is_enabled && group.options.length > 0) },
  ];
  return (
    <div className="ds-step">
      <LivePreview draft={draft} />
      <div className="ds-checklist">
        {checklist.map((item) => (
          <span key={item.label} data-ok={item.ok ? "true" : "false"}>
            {item.ok ? "✓" : "○"} {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
