import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Bank } from "../../../utils/validation/bankTransfer";
import { searchBanks } from "../../../utils/bankSearch";
import { inputClass, type FieldSurface } from "../../common/form/fieldStyles";
import { SelectChevron } from "../../common/form/Field";

interface Props {
  /** Ids from the surrounding Field, so the label and messages are announced. */
  id: string;
  describedBy?: string;
  invalid: boolean;
  surface: FieldSurface;
  banks: readonly Bank[];
  loading: boolean;
  /** The chosen bank's code, or "" while none is chosen. */
  value: string;
  onChange: (code: string) => void;
}

/**
 * Rendering all ~800 banks at once makes the list slow on low-end phones and
 * useless to scroll; a few dozen is plenty when the seller can keep typing.
 */
const MAX_SHOWN = 50;

/**
 * Type-to-search bank picker (the ARIA combobox pattern). Typing filters the
 * list; arrows move, Enter picks, Escape closes. Typing after a pick clears
 * it, so the code sent always belongs to the name on screen.
 */
export default function BankSearchField({ id, describedBy, invalid, surface, banks, loading, value, onChange }: Props) {
  const listId = useId();
  const selected = banks.find((b) => b.code === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Show the chosen bank's name when the choice changes from outside (or the list arrives late).
  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected]);

  const matches = useMemo(
    // The chosen name in the box isn't a search: show the whole list again.
    () => searchBanks(banks, selected && query === selected.name ? "" : query),
    [banks, query, selected]
  );
  const shown = matches.slice(0, MAX_SHOWN);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (bank: Bank) => {
    onChange(bank.code);
    setQuery(bank.name);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (shown.length ? (i + step + shown.length) % shown.length : 0));
    } else if (e.key === "Enter" && open) {
      // Picks the highlighted bank instead of submitting the form.
      e.preventDefault();
      e.stopPropagation();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const fill = surface === "card" ? "bg-[#3A3C41]" : "bg-[#1a1c20]";

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={loading ? "Loading banks…" : "Type to search, e.g. GTBank"}
        disabled={loading}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          if (selected) return setQuery(selected.name);
          // A name typed out in full counts as picking it, so it doesn't look chosen when it isn't.
          const exact = banks.find((b) => b.name.toLowerCase() === query.trim().toLowerCase());
          if (exact) pick(exact);
        }}
        onKeyDown={onKeyDown}
        className={`${inputClass(surface, invalid)} pr-8`}
      />
      <SelectChevron />

      {open && !loading && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Banks"
          className={`absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-[#767C87] ${fill} py-1 shadow-2xl shadow-black/60`}
        >
          {shown.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400" role="presentation">
              No bank matches “{query.trim()}”. Check the spelling.
            </li>
          ) : (
            shown.map((bank, i) => {
              const isSelected = bank.code === value;
              return (
                <li
                  key={bank.code}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  // mousedown, not click: picking must land before the input's blur closes the list.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(bank);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-3 py-2.5 text-sm text-white ${
                    i === active ? "bg-[#45474D]" : ""
                  } ${isSelected ? "border-l-2 border-red-600" : ""}`}
                >
                  {bank.name}
                </li>
              );
            })
          )}
          {matches.length > MAX_SHOWN && (
            <li className="px-3 py-2 text-xs text-gray-400" role="presentation">
              Keep typing to see more banks.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
