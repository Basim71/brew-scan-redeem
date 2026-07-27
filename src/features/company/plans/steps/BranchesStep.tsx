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
  function togInclude(id: string) {
    onChange({
      allowed_branch_ids: value.allowed_branch_ids.includes(id)
        ? value.allowed_branch_ids.filter((x) => x !== id)
        : [...value.allowed_branch_ids, id],
      excluded_branch_ids: value.excluded_branch_ids.filter((x) => x !== id),
    });
  }
  function togExclude(id: string) {
    onChange({
      excluded_branch_ids: value.excluded_branch_ids.includes(id)
        ? value.excluded_branch_ids.filter((x) => x !== id)
        : [...value.excluded_branch_ids, id],
      allowed_branch_ids: value.allowed_branch_ids.filter((x) => x !== id),
    });
  }
  const allIncluded =
    branches.length > 0 && value.allowed_branch_ids.length === branches.length;
  return (
    <div className="pb-step">
      <p className="pb-hint">{S.branches_hint[lang]}</p>
      <div className="pb-toolbar">
        <button
          type="button"
          className="pb-btn-ghost"
          onClick={() =>
            onChange({
              allowed_branch_ids: allIncluded ? [] : branches.map((b) => b.id),
              excluded_branch_ids: [],
            })
          }
        >
          {allIncluded ? S.clear[lang] : S.select_all[lang]}
        </button>
      </div>
      <div className="pb-branches">
        <div>
          <div className="pb-section-label">{S.branches_include[lang]}</div>
          <div className="pb-branch-list">
            {branches.map((b) => (
              <label key={`i-${b.id}`} className="pb-branch-row">
                <input
                  type="checkbox"
                  checked={value.allowed_branch_ids.includes(b.id)}
                  onChange={() => togInclude(b.id)}
                />
                <span>{lang === "ar" ? b.name_ar : b.name_en}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="pb-section-label">{S.branches_exclude[lang]}</div>
          <div className="pb-branch-list">
            {branches.map((b) => (
              <label key={`e-${b.id}`} className="pb-branch-row">
                <input
                  type="checkbox"
                  checked={value.excluded_branch_ids.includes(b.id)}
                  onChange={() => togExclude(b.id)}
                />
                <span>{lang === "ar" ? b.name_ar : b.name_en}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}