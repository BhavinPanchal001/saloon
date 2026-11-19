import { X } from "lucide-react";
import { getTalentNames, isTalentEffortValid, splitTalentEffort } from "../../utils/talentAssignments";

export function TalentPicker({ staff, value = [], onChange, label = "Assign Talent" }) {
  const selected = value.map(({ staffId }) => staffId);
  const available = staff.filter((member) => !selected.includes(String(member.id)));
  const valid = isTalentEffortValid(value);

  const changeSelection = (ids) => {
    const currentSplit = splitTalentEffort(selected);
    const wasEven = value.every(({ percentage }, index) => String(percentage) === String(currentSplit[index].percentage));
    onChange(ids.length <= 1 || wasEven
      ? splitTalentEffort(ids)
      : ids.map((staffId) => value.find((entry) => entry.staffId === staffId) ?? { staffId, percentage: 0 }));
  };

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <select
        aria-label={label}
        className="premium-input !py-2 !px-3 !text-xs w-full"
        value=""
        onChange={(event) => {
          if (event.target.value) changeSelection([...selected, event.target.value]);
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
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-navy-700">Effort %</p>
          {value.map(({ staffId: id, percentage }) => {
            const name = getTalentNames([id], staff)[0];
            return (
              <div key={id} className="flex items-center gap-2 rounded-lg bg-navy-50 px-2 py-1 text-xs font-medium text-navy-700">
                <span className="min-w-0 flex-1 break-words">{name}</span>
                <input
                  aria-label={`Effort percentage for ${name}`}
                  type="text"
                  inputMode="decimal"
                  className="premium-input !px-1.5 !py-1 !text-xs w-16 text-right tabular-nums"
                  value={percentage}
                  onChange={(event) => onChange(value.map((entry) => entry.staffId === id ? { ...entry, percentage: event.target.value } : entry))}
                />
                <button type="button" aria-label={`Remove ${name}`} onClick={() => changeSelection(selected.filter((idToKeep) => idToKeep !== id))} className="shrink-0 rounded p-0.5 hover:bg-navy-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {!valid && <p role="alert" className="text-xs text-rose-700">Enter 0–100% per talent with up to two decimals. The shares must total 100%.</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {selected.length > 1 && <button type="button" className="text-xs text-navy-700 underline" onClick={() => onChange(splitTalentEffort(selected))}>Split evenly</button>}
            <button type="button" className="text-xs text-slate-500 hover:text-navy-800" onClick={() => onChange([])}>Clear all</button>
          </div>
        </div>
      )}
    </div>
  );
}
