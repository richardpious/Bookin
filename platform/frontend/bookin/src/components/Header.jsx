import { useState, useEffect } from 'react';
import { HeaderSearch } from './HeaderSearch';
import { ModelSelector } from './ModelSelector';
import { ThinkingLevelSelector } from './ThinkingLevelSelector';

export const Header = ({ onModelChange, onThinkingLevelChange, sessionId, onSearch, username, onLogout }) => {
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [sessionData, setSessionData] = useState(null);

  const refreshSessionData = () => {
    if (sessionId) {
      fetch(`/init-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Refreshed session data:", data);
          setSessionData(data);
        })
        .catch(err => console.error('Error fetching session:', err));
    }
  };

  useEffect(() => {
    console.log("Header session change detected, fetching:", sessionId);
    if (sessionId) {
      setSessionData(null); // Clear previous data so selectors reset
      refreshSessionData();
    }
  }, [sessionId]);

  const handleModelChange = async (model) => {
    const result = await onModelChange(model);
    if (result && result.ok) {
      refreshSessionData(); // Refresh data to get new available thinking levels
    }
    return result;
  };

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <header className="app-header">
      {/* Left — Logo */}
      <div className="header-left">
        <img src="/logolight.png" alt="BookIn Logo" className="logo-img" />
        <span className="logo">BookIn</span>
      </div>

      {/* Center — Search */}
      <HeaderSearch
        onSearch={onSearch}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Right — Model selector & User Profile */}
      <div className="header-right">
        <ModelSelector
          sessionId={sessionId}
          initialModel={sessionData?.model}
          availableModels={sessionData?.models}
          onModelChange={handleModelChange}
          onToast={showToast}
        />
        <ThinkingLevelSelector
          sessionId={sessionId}
          initialLevel={sessionData?.thinkingLevel}
          availableLevels={sessionData?.thinkingLevels}
          onLevelChange={onThinkingLevelChange}
          onToast={showToast}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {username}
          </span>
          <button 
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toastType === 'error' ? 'toast-error' : ''}`}>
            {toast}
          </div>
        </div>
      )}
    </header>
  );
};

