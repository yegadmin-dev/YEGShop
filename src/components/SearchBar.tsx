import type { FormEvent } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Cari map K-13, full-colour, sertifikat, atau lanyard...',
  submitLabel = 'Cari',
  className = '',
}: SearchBarProps) {
  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.(value.trim());
  };

  return (
    <form onSubmit={handleFormSubmit} className={`relative w-full ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-11 pl-10 pr-28 rounded-xl border border-slate-200 bg-white text-sm text-[#071A12] placeholder:text-slate-400 focus:outline-none focus:border-[#065E46] transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onSubmit?.('');
          }}
          aria-label="Bersihkan pencarian"
          className="absolute right-20 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-[#065E46] text-white text-xs font-semibold hover:bg-[#054735] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        {submitLabel}
      </button>
    </form>
  );
}
