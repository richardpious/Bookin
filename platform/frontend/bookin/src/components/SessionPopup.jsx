import React, { useState, useEffect } from 'react';

export const SessionPopup = ({ show, tempSessionId, setTempSessionId, onDone }) => {
  const [existingSessions, setExistingSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setLoading(true);
      fetch('http://127.0.0.1:8000/sessions')
        .then(res => res.json())
        .then(data => {
          if (data.sessions) {
            setExistingSessions(data.sessions);
          }
        })
        .catch(err => console.error('Failed to fetch sessions:', err))
        .finally(() => setLoading(false));
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3 style={{ color: 'white', marginBottom: '10px' }}>Switch Session</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.875rem' }}>
            Select Existing {loading && <span style={{ color: '#3b82f6', marginLeft: '5px' }}>Loading...</span>}
          </label>
          <select
          value={tempSessionId} 
          onChange={(e) => setTempSessionId(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', color: 'white', border: '1px solid var(--border-light)', borderRadius: '4px' }}
        >
            <option value="">{loading ? 'Fetching...' : '-- Choose session --'}</option>
          {existingSessions.map(session => (
            <option key={session} value={session}>{session}</option>
          ))}
        </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.875rem' }}>
            Or Enter New ID
          </label>
          <input
          value={tempSessionId} 
          onChange={(e) => setTempSessionId(e.target.value)} 
            placeholder="e.g. my-new-session"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'white' }}
        />
      </div>

        <button
          onClick={onDone}
          style={{ width: '100%', padding: '10px', backgroundColor: '#646464', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
        >
          Done
        </button>
    </div>
    </div>
  );
};

