import { X } from "lucide-react";
import { getTalentNames } from "../../utils/talentAssignments";

export function TalentPicker({ staff, value = [], onChange, label = "Assign Talent" }) {
  const selected = [...new Set(value.map(String))];
  const available = staff.filter((member) => !selected.includes(String(member.id)));

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <select
        aria-label={label}
        className="premium-input !py-2 !px-3 !text-xs w-full"
        value=""
        onChange={(event) => {
          if (event.target.value) onChange([...selected, event.target.value]);
        }}
        disabled={available.length === 0}
      >
        <option value="">
          {staff.length === 0 ? "No talents available" : available.length === 0 ? "All talents selected" : selected.length ? "Add another talent" : "Assign Talent"}
        </option>
        {available.map((member) => (
          <option key={member.id} value={member.id}>{member.name || member.fullName}</option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const name = getTalentNames([id], staff)[0];
            return (
              <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-navy-50 px-2 py-1 text-xs font-medium text-navy-700">
                <span className="truncate">{name}</span>
                <button type="button" aria-label={`Remove ${name}`} onClick={() => onChange(selected.filter((value) => value !== id))} className="shrink-0 rounded p-0.5 hover:bg-navy-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <button type="button" className="px-1 text-xs text-slate-500 hover:text-navy-800" onClick={() => onChange([])}>Clear all</button>
        </div>
      )}
    </div>
  );
}
