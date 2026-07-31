import type { PlanInput } from "@/services/company/plans.service";
import type { BranchRow } from "@/services/company/branches.service";
import { S } from "../strings";

export default function BranchesStep({
  lang,
  value,
  onChange,
  branches,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  onChange: (p: Partial<PlanInput>) => void;
  branches: BranchRow[];
}) {
  const selectedMode = value.allowed_branch_ids.length > 0;

  function toggle(id: string) {
    onChange({
      allowed_branch_ids: value.allowed_branch_ids.includes(id)
        ? value.allowed_branch_ids.filter((x) => x !== id)
        : [...value.allowed_branch_ids, id],
      excluded_branch_ids: [],
    });
  }

  return (
    <div className="ds-step">
      <div className="ds-field">
        <span>{S.available_at[lang]}</span>
        <div className="ds-pills">
          <button
            type="button"
            className="ds-pill"
            data-active={!selectedMode}
            onClick={() => onChange({ allowed_branch_ids: [], excluded_branch_ids: [] })}
          >
            {S.all_branches[lang]}
          </button>
          <button
            type="button"
            className="ds-pill"
            data-active={selectedMode}
            onClick={() =>
              onChange({
                allowed_branch_ids:
                  value.allowed_branch_ids.length > 0
                    ? value.allowed_branch_ids
                    : branches.slice(0, 1).map((b) => b.id),
                excluded_branch_ids: [],
              })
            }
          >
            {S.selected_branches[lang]}
          </button>
        </div>
        {!selectedMode && <p className="ds-hint">{S.branches_hint[lang]}</p>}
      </div>

      {selectedMode && (
        <div className="pb-branch-list">
          {branches.map((b) => (
            <label key={b.id} className="pb-branch-row">
              <input
                type="checkbox"
                checked={value.allowed_branch_ids.includes(b.id)}
                onChange={() => toggle(b.id)}
              />
              <span>{lang === "ar" ? b.name_ar : b.name_en}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}