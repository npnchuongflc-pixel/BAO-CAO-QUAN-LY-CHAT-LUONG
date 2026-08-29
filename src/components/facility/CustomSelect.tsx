import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface OptionItem {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  icon?: React.ReactNode;
  value: string;
  options: (OptionItem | string)[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  icon,
  value,
  options,
  onChange,
  placeholder = 'Chọn...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options array
  const normalizedOptions: OptionItem[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Find label for current value
  const currentOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = currentOption ? currentOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
          {icon}
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 flex items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium ${
          isOpen ? 'ring-2 ring-emerald-500 bg-white border-emerald-500' : 'hover:bg-slate-100/80'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Downward Popup Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-xs px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 font-normal'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
