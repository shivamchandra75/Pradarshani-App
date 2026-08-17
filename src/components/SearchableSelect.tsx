import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, BookOpen } from 'lucide-react';

export interface SelectOption {
  id: string;
  name: string;
  image_url?: string | null;
}

interface SearchableSelectProps {
  options: SelectOption[];
  selectedValue: string;
  onChange: (id: string) => void;
  onAddNew?: (name: string) => Promise<void>;
  placeholder: string;
  disabled?: boolean;
  label?: string;
  renderItemSuffix?: (option: SelectOption) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  selectedValue,
  onChange,
  onAddNew,
  placeholder,
  disabled = false,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === selectedValue);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const exactMatch = options.some(
    (opt) => opt.name.toLowerCase() === searchQuery.toLowerCase().trim()
  );

  const handleAddNew = async () => {
    if (!onAddNew || !searchQuery.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await onAddNew(searchQuery.trim());
      setSearchQuery('');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to add new option:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}

      {/* Selected Box Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 bg-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60 border-gray-200' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedOption ? (
          <div className="flex items-center space-x-3 overflow-hidden">
            {selectedOption.image_url ? (
              <img
                src={selectedOption.image_url}
                alt={selectedOption.name}
                className="w-7 h-9 object-cover rounded shadow-sm border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-7 h-9 bg-indigo-50 rounded border border-indigo-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
            )}
            <span className="text-gray-900 font-medium truncate">{selectedOption.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <span className="ml-2 text-gray-400 text-xs">▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col">
          {/* Search Input inside Dropdown */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center space-x-3 hover:bg-indigo-50 transition-colors ${
                    opt.id === selectedValue ? 'bg-indigo-50/60 font-semibold' : ''
                  }`}
                >
                  {opt.image_url ? (
                    <img
                      src={opt.image_url}
                      alt={opt.name}
                      className="w-8 h-10 object-cover rounded shadow-sm border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm text-gray-800 truncate">{opt.name}</span>
                </button>
              ))
            ) : (
              <div className="p-3 text-xs text-gray-500 text-center">No matching options found.</div>
            )}

            {/* Inline Add New Option */}
            {onAddNew && searchQuery.trim() && !exactMatch && (
              <button
                type="button"
                disabled={isAdding}
                onClick={handleAddNew}
                className="w-full text-left px-3 py-2.5 flex items-center space-x-2 text-indigo-600 font-medium hover:bg-indigo-50 transition-colors border-t border-gray-100"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">
                  {isAdding ? 'Adding...' : `Add "${searchQuery.trim()}"`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
