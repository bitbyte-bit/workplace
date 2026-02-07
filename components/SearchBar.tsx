
import React, { useState, useMemo } from 'react';
import { SearchIcon, XIcon, PackageIcon, SalesIcon, DebtIcon, ExpenseIcon } from './Icons';

export interface SearchResult {
  id: string;
  name: string;
  type: 'stock' | 'sale' | 'debt' | 'expense';
  quantity?: number;
  amount?: number;
  date?: number;
  category?: string;
  debtorName?: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  results?: SearchResult[];
  onSelect?: (result: SearchResult) => void;
}

const typeIcons = {
  stock: PackageIcon,
  sale: SalesIcon,
  debt: DebtIcon,
  expense: ExpenseIcon,
};

const typeColors = {
  stock: 'bg-emerald-100 text-emerald-600',
  sale: 'bg-blue-100 text-blue-600',
  debt: 'bg-amber-100 text-amber-600',
  expense: 'bg-purple-100 text-purple-600',
};

const SearchBar: React.FC<Props> = ({ value, onChange, results = [], onSelect }) => {
  const [isFocused, setIsFocused] = useState(false);
  const isSearching = value.length > 0;

  // Get icon and color for a result type
  const getResultIcon = (type: keyof typeof typeIcons) => {
    const Icon = typeIcons[type];
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="relative w-full">
      <div 
        className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
          isFocused ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
        }`}
      >
        <SearchIcon className="w-4 h-4" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 border rounded-xl leading-5 bg-[var(--color-background-alt)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all sm:text-sm"
        style={{ 
          borderColor: 'var(--color-surface-border)',
          color: 'var(--color-text)',
        }}
        placeholder="Search sales, stock, debts, expenses..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <XIcon className="w-4 h-4 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-muted)' }} />
        </button>
      )}

      {/* Search Results Overlay */}
      {isSearching && (
        <div 
          className="absolute z-50 left-0 right-0 mt-2 bg-[var(--color-surface)] rounded-xl shadow-xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          {results.length > 0 ? (
            <div className="py-2 max-h-96 overflow-y-auto custom-scrollbar">
              {/* Group results by type */}
              {(['stock', 'sale', 'debt', 'expense'] as const).map(type => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) return null;
                
                return (
                  <div key={type}>
                    <div 
                      className="px-4 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                      style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-background-alt)' }}
                    >
                      {getResultIcon(type)}
                      {type}s ({typeResults.length})
                    </div>
                    {typeResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => onSelect?.(result)}
                        className="w-full px-4 py-3 text-left hover:bg-[var(--color-background-alt)] flex items-center justify-between transition-colors"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {result.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {result.category && (
                              <span className="text-xs opacity-60">{result.category}</span>
                            )}
                            {result.debtorName && (
                              <span className="text-xs opacity-60">{result.debtorName}</span>
                            )}
                            {result.date && (
                              <span className="text-xs opacity-60">
                                {new Date(result.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {result.quantity !== undefined && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[type]}`}>
                              Qty: {result.quantity}
                            </span>
                          )}
                          {result.amount !== undefined && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[type]}`}>
                              ${result.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No results found for "<span style={{ color: 'var(--color-text)' }}>{value}</span>"
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Try a different search term
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
