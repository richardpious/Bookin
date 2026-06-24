import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export const HeaderSearch = ({ onSearch, onError }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // Ctrl+K / Cmd+K focuses the search bar from anywhere in the app
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search request failed');
      const data = await res.json();
      if (onSearch) onSearch(data.results, q);
    } catch (err) {
      console.error('Search error:', err);
      if (onError) onError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form className="header-search-form" onSubmit={handleSubmit}>
      <div className="header-search-box">
        <Search size={14} className="header-search-icon" />
        <input
          ref={searchRef}
          id="global-search-input"
          type="text"
          className="header-search-input"
          placeholder="Search booksim…  (Ctrl+K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {searchQuery && (
          <button
            type="button"
            className="header-search-clear"
            onClick={() => setSearchQuery('')}
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
        {isSearching && <span className="header-search-spinner" />}
      </div>
    </form>
  );
};
