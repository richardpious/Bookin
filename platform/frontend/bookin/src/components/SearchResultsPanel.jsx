import { useEffect, useRef } from 'react';
import { X, FileText } from 'lucide-react';

// Splits a line of text into [before, match, after] spans using submatch offsets
const HighlightedLine = ({ text, submatches }) => {
  if (!submatches || submatches.length === 0) return <span>{text}</span>;

  const parts = [];
  let cursor = 0;

  // ripgrep can return multiple submatches per line; render them all
  for (const sm of submatches) {
    if (sm.start > cursor) parts.push(<span key={cursor}>{text.slice(cursor, sm.start)}</span>);
    parts.push(
      <mark key={sm.start} style={{ background: 'rgba(234, 179, 8, 0.35)', color: '#fde047', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(sm.start, sm.end)}
      </mark>
    );
    cursor = sm.end;
  }
  if (cursor < text.length) parts.push(<span key={cursor}>{text.slice(cursor)}</span>);

  return <>{parts}</>;
};

const SearchResultsPanel = ({ results, query, onOpenFile, onClose }) => {
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!results) return null;

  const filePaths = Object.keys(results);
  const totalMatches = filePaths.reduce((acc, p) => acc + results[p].length, 0);

  return (
    // Full-screen dimmed backdrop
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 500,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '60px', // just below the header
      animation: 'fadeIn 0.12s ease-out',
    }}>
      <div
        ref={panelRef}
        style={{
          width: '680px',
          maxHeight: 'calc(100vh - 100px)',
          background: '#1f1f1f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideIn 0.15s ease-out',
        }}
      >
        {/* Panel header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#242424',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '13px', color: '#a0a0a0' }}>
            {filePaths.length === 0
              ? `No results for "${query}"`
              : `${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${filePaths.length} file${filePaths.length !== 1 ? 's' : ''} — "${query}"`
            }
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filePaths.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '14px' }}>
              No matches found
            </div>
          ) : (
            filePaths.map((filePath) => (
              <div key={filePath}>
                {/* File path header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px 4px',
                  background: '#272727',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}>
                  <FileText size={13} style={{ color: '#7c7c9e', flexShrink: 0 }} />
                  <span style={{
                    fontSize: '12px',
                    color: '#9898c0',
                    fontFamily: 'ui-monospace, Consolas, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }} title={filePath}>
                    {filePath}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#d1d5db',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    flexShrink: 0,
                  }}>
                    {results[filePath].length}
                  </span>
                </div>

                {/* Matches in this file */}
                {results[filePath].map((match, idx) => (
                  <div
                    key={idx}
                    onClick={() => { onOpenFile(filePath, match.line); onClose(); }}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '5px 16px 5px 20px',
                      cursor: 'pointer',
                      fontFamily: 'ui-monospace, Consolas, monospace',
                      fontSize: '13px',
                      transition: 'background 0.1s',
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.045)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Line number */}
                    <span style={{
                      minWidth: '36px',
                      color: '#4b5563',
                      textAlign: 'right',
                      userSelect: 'none',
                      flexShrink: 0,
                      fontSize: '12px',
                      paddingTop: '1px',
                    }}>
                      {match.line}
                    </span>
                    {/* Code snippet */}
                    <span style={{
                      color: '#c9d1d9',
                      whiteSpace: 'pre',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      <HighlightedLine text={match.text} submatches={match.submatches} />
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPanel;

