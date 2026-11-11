import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, Search } from 'lucide-react';
import { phoneCountryOptions } from '../../../../../shared/employeePhone.js';

type Country = typeof phoneCountryOptions[number];

export function PhoneCountryPicker({ value, invalid, onChange }: {
  value: string;
  invalid: boolean;
  onChange: (country: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = phoneCountryOptions.find(country => country.country === value);
  const term = query.trim().toLowerCase();
  const filtered = phoneCountryOptions.filter(country => `${country.name} ${country.country} ${country.code}`.toLowerCase().includes(term));

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  const choose = (country: Country) => {
    onChange(country);
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div className="phone-country-picker" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="phone-country-trigger" aria-label={selected ? `Phone country: ${selected.label}` : 'Select phone country'} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${listId}-dialog` : undefined} aria-invalid={invalid} aria-describedby={invalid ? 'error-phoneCountryCode' : undefined} title={selected?.label} onClick={() => {
        setQuery('');
        setActive(0);
        setOpen(!open);
      }}>
        <span className="phone-country-flag" aria-hidden="true">{selected ? selected.flag : <Globe2 size={18} />}</span>
        <span className="phone-country-selection"><span>{selected ? selected.code : 'Country'}</span></span>
        <ChevronDown size={14} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className="phone-country-panel" id={`${listId}-dialog`} role="dialog" aria-label="Choose phone country" onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
        }}>
          <div className="phone-country-search">
            <Search size={17} aria-hidden="true" />
            <input ref={search} type="text" role="combobox" aria-label="Search countries or calling codes" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined} placeholder="Search country or code..." value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, filtered.length - 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
              if (event.key === 'Enter') { event.preventDefault(); if (filtered[active]) choose(filtered[active]); }
            }} />
          </div>
          <div className="phone-country-list" role="listbox" id={listId} aria-label="Countries and calling codes">
            {filtered.map((country, index) => (
              <div key={country.country} id={`${listId}-${index}`} role="option" aria-selected={value === country.country} className={`phone-country-option ${active === index ? 'is-highlighted' : ''} ${value === country.country ? 'is-selected' : ''}`} onMouseEnter={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(country)}>
                <span className="phone-country-flag" aria-hidden="true">{country.flag}</span>
                <span className="phone-country-name">{country.name}<small>{country.country}</small></span>
                <span className="phone-country-code">{country.code}</span>
                {value === country.country && <Check size={15} aria-hidden="true" />}
              </div>
            ))}
            {!filtered.length && <p className="phone-country-empty" role="status">No countries found. Try a name or calling code.</p>}
          </div>
          <div className="phone-country-footer">{filtered.length} countries &amp; territories</div>
        </div>
      )}
    </div>
  );
}
