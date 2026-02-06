
import React from 'react';
import { SearchIcon, XIcon } from './Icons';

interface SearchResult {
  id: string;
  name: string;
  type: 'stock' | 'sale' | 'debt' | 'expense';
  quantity?: number;
  amount?: number;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  results?: SearchResult[];
  onSelect?: (result: SearchResult) => void;
}

const SearchBar: React.FC<Props> = ({ value, onChange, results = [], onSelect }) => {
  const isSearching = value.length > 0;

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="text-slate-400 w-4 h-4" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all sm:text-sm"
        placeholder="Search anything..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <XIcon className="text-slate-400 w-4 h-4 hover:text-slate-600" />
        </button>
      )}

      {/* Search Results Overlay */}
      {isSearching && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onSelect?.(result)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-800">{result.name}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider capitalize">{result.type}</p>
                  </div>
                  {result.quantity !== undefined && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                      Qty: {result.quantity}
                    </span>
                  )}
                  {result.amount !== undefined && (
                    <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full font-medium">
                      ${result.amount.toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No results found for "{value}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
