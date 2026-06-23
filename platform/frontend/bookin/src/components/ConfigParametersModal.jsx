import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../index.css'; // ensure styles are imported if needed

export const ConfigParametersModal = ({ isOpen, onClose, onAddParameter }) => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      fetch('http://localhost:8000/config-parameters')
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setParameters(data.parameters || []);
          }
        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-main, #1e1e1e)',
        border: '1px solid var(--border-light, #333)',
        borderRadius: '8px',
        width: '80%',
        maxWidth: '800px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        color: 'var(--text-primary, #fff)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-light, #333)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Booksim Configuration Parameters</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary, #aaa)', cursor: 'pointer'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {loading && <div>Loading parameters...</div>}
          {error && <div style={{ color: '#ef4444' }}>Error: {error}</div>}
          {!loading && !error && parameters.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-light, #333)' }}>Parameter</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-light, #333)' }}>Type</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-light, #333)' }}>Default Value</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-light, #333)', width: '60px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light, #333)' }}>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: '#60a5fa' }}>{param.name}</td>
                    <td style={{ padding: '12px 8px', fontSize: '0.9em', color: 'var(--text-secondary, #aaa)' }}>{param.type}</td>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>{param.defaultValue === '' ? '""' : param.defaultValue}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        onClick={() => onAddParameter && onAddParameter(param)}
                        style={{
                          background: '#525252ff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && parameters.length === 0 && (
            <div>No parameters found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
