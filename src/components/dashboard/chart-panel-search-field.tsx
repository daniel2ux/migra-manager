import React, { useEffect, useState, memo } from "react";
import { Search, X } from "lucide-react";

interface ChartPanelSearchFieldProps {
  value: string;
  onSearchCommit: (value: string) => void;
  isFiori: boolean;
  ariaLabel?: string;
}

export const ChartPanelSearchField = memo(function ChartPanelSearchField({
  value,
  onSearchCommit,
  isFiori,
  ariaLabel = "Buscar objeto no gráfico",
}: ChartPanelSearchFieldProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value.toUpperCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onSearchCommit(localValue);
  };

  const handleClear = () => {
    setLocalValue("");
    onSearchCommit("");
  };

  const inputProps = {
    type: "text" as const,
    placeholder: "Buscar objeto... (Enter)",
    value: localValue,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    "aria-label": ariaLabel,
    autoComplete: "off" as const,
    spellCheck: false,
  };

  if (isFiori) {
    return (
      <div className="fiori-analytical-card__search">
        <div className="fiori-search-shell">
          <Search className="fiori-search-icon" />
          <input {...inputProps} className="fiori-search-input uppercase" />
          {localValue && (
            <button
              type="button"
              className="fiori-search-clear"
              onClick={handleClear}
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 w-[200px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      <input
        {...inputProps}
        className="w-full h-8 pl-8 pr-8 text-[9px] font-bold uppercase tracking-wide bg-white border border-slate-200 rounded-sm outline-none focus:border-slate-400"
      />
      {localValue && (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
          onClick={handleClear}
          aria-label="Limpar busca"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});
