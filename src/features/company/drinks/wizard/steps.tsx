import { useState } from "react";
import { Check, Copy, GripVertical, Plus, Trash2, X } from "lucide-react";

import { Button, FileUpload, Input } from "@/components/kob";
import { useI18n } from "@/lib/i18n";
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

const INTENSITY_KEYS: IntensityLevel[] = ["none", "low", "medium", "high"];

export function IdentityStep({ draft, patch }: StepProps) {
  const { t, lang } = useI18n();
  return (
    <div className="ds-step">
      <div className="ds-grid-2">
        <Input
          label={t("drinks.englishName")}
          value={draft.name_en}
          onChange={(e) => patch({ name_en: e.target.value })}
          placeholder={t("drinks.englishNamePh")}
        />
        <Input
          label={t("drinks.arabicName")}
          dir="rtl"
          value={draft.name_ar}
          onChange={(e) => patch({ name_ar: e.target.value })}
          placeholder={t("drinks.arabicNamePh")}
        />
      </div>
      <div className="ds-field">
        <span>{t("drinks.category")}</span>
        <Pills
          value={draft.category}
          options={DRINK_CATEGORIES.map((category) => ({ key: category.key as string, label: t(`drinks.cat.${category.key}`) }))}
          onChange={(category) => patch({ category })}
        />
      </div>
      <div className="ds-field">
        <span>{t("drinks.status")}</span>
        <Pills
          value={draft.is_active ? "active" : "inactive"}
          options={[
            { key: "active", label: t("drinks.active") },
            { key: "inactive", label: t("drinks.inactive") },
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
  const { t, lang } = useI18n();
  return (
    <div className="ds-step">
      <FileUpload accept="image/*" busy={uploading} onFiles={(files) => files[0] && onPickFile(files[0])}>
        {uploading ? t("drinks.uploading") : t("drinks.dropHint")}
      </FileUpload>

      {draft.image_url && (
        <div className="ds-image-tools">
          <label className="ds-field">
            <span>{t("drinks.zoom")}</span>
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
            <span>{t("drinks.posX")}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.image_offset.x}
              onChange={(e) => patch({ image_offset: { ...draft.image_offset, x: Number(e.target.value) } })}
            />
          </label>
          <label className="ds-field">
            <span>{t("drinks.posY")}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.image_offset.y}
              onChange={(e) => patch({ image_offset: { ...draft.image_offset, y: Number(e.target.value) } })}
            />
          </label>
          <div className="ds-inline-actions">
            <FileUpload accept="image/*" onFiles={(files) => files[0] && onPickFile(files[0])}>
              {t("drinks.replaceImage")}
            </FileUpload>
            <Button variant="danger" onClick={() => patch({ image_url: null, image_path: null })}>
              {t("drinks.removeImage")}
            </Button>
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
  const { t, lang } = useI18n();
  return (
    <div className="ds-step">
      <div className="ds-grid-2">
        <Input
          label={t("drinks.caloriesKcal")}
          inputMode="numeric"
          value={draft.calories}
          onChange={(e) => patch({ calories: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          placeholder="120"
        />
        <div className="ds-field">
          <span>{t("drinks.servingSize")}</span>
          <Pills
            value={draft.serving_size}
            options={[
              { key: "small", label: t("drinks.small") },
              { key: "medium", label: t("drinks.medium") },
              { key: "large", label: t("drinks.large") },
            ]}
            onChange={(serving_size) => patch({ serving_size })}
          />
        </div>
      </div>
      <div className="ds-field">
        <span>{t("drinks.served")}</span>
        <Pills<TemperatureMode>
          value={draft.temperature}
          options={[
            { key: "hot", label: t("drinks.hot") },
            { key: "cold", label: t("drinks.cold") },
            { key: "both", label: t("drinks.both") },
          ]}
          onChange={(temperature) => patch({ temperature })}
        />
      </div>
      <div className="ds-grid-2">
        <div className="ds-field">
          <span>{t("drinks.caffeine")}</span>
          <Pills<IntensityLevel>
            value={draft.caffeine}
            options={INTENSITY_KEYS.map((key) => ({ key, label: t(`drinks.level.${key}`) }))}
            onChange={(caffeine) => patch({ caffeine })}
          />
        </div>
        <div className="ds-field">
          <span>{t("drinks.sugar")}</span>
          <Pills<IntensityLevel> value={draft.sugar} options={INTENSITY_KEYS.map((key) => ({ key, label: t(`drinks.level.${key}`) }))} onChange={(sugar) => patch({ sugar })} />
        </div>
      </div>
      <p className="ds-hint">
        {t("drinks.nutritionHint")}
      </p>
    </div>
  );
}

export function AllergensStep({ draft, patch }: StepProps) {
  const { t, lang } = useI18n();
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
          <strong>{t("drinks.noAllergens")}</strong>
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
              <strong>{lang === "ar" ? card.ar : card.en}</strong>
              {active && <Check className="ds-allergen-check h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OptionsStep({ draft, patch }: StepProps) {
  const { t, lang } = useI18n();
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
            <strong>{lang === "ar" ? template.label_ar : template.label_en}</strong>
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
                placeholder={t("drinks.groupNameEn")}
                onChange={(e) => updateGroup(index, { name_en: e.target.value })}
              />
              <input
                className="ds-group-name"
                dir="rtl"
                value={group.name_ar}
                placeholder={t("drinks.groupNameAr")}
                onChange={(e) => updateGroup(index, { name_ar: e.target.value })}
              />
              <div className="ds-group-actions">
                <button
                  type="button"
                  title={t("drinks.duplicate")}
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
                  title={t("drinks.delete")}
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
                  { key: "single", label: t("drinks.single") },
                  { key: "multiple", label: t("drinks.multiple") },
                ]}
                onChange={(selection_type) => updateGroup(index, { selection_type })}
              />
              <Pills
                value={group.is_required ? "required" : "optional"}
                options={[
                  { key: "required", label: t("drinks.required") },
                  { key: "optional", label: t("drinks.optional") },
                ]}
                onChange={(value) => updateGroup(index, { is_required: value === "required" })}
              />
              <Pills
                value={group.is_enabled ? "enabled" : "disabled"}
                options={[
                  { key: "enabled", label: t("drinks.enabledL") },
                  { key: "disabled", label: t("drinks.disabledL") },
                ]}
                onChange={(value) => updateGroup(index, { is_enabled: value === "enabled" })}
              />
            </div>

            <div className="ds-option-rows">
              {group.options.map((option, optionIndex) => (
                <div key={option.key} className="ds-option-row">
                  <input
                    value={option.name_en}
                    placeholder={t("drinks.optionEn")}
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
                    placeholder={t("drinks.optionAr")}
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
                    title={t("drinks.defaultOption")}
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
                    {t("drinks.default")}
                  </button>
                  <button
                    type="button"
                    className="ds-icon-danger"
                    title={t("drinks.removeOption")}
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
                {t("drinks.addOption")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewStep({ draft }: { draft: DrinkDraft }) {
  const { t, lang } = useI18n();
  const checklist = [
    { label: t("drinks.englishName"), ok: Boolean(draft.name_en.trim()) },
    { label: t("drinks.arabicName"), ok: Boolean(draft.name_ar.trim()) },
    { label: t("drinks.image"), ok: Boolean(draft.image_url) },
    { label: t("drinks.calories"), ok: Boolean(draft.calories) },
    { label: t("drinks.allergens"), ok: draft.allergens.length > 0 },
    { label: t("drinks.options"), ok: draft.groups.some((group) => group.is_enabled && group.options.length > 0) },
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
