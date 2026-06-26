import { useState, useEffect } from 'react';
import { HeaderSearch } from './HeaderSearch';
import { ModelSelector } from './ModelSelector';
import { ThinkingLevelSelector } from './ThinkingLevelSelector';

export const Header = ({ onModelChange, onThinkingLevelChange, sessionId, onSearch }) => {
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    console.log("Header session change detected, fetching:", sessionId);
    if (sessionId) {
      setSessionData(null); // Clear previous data so selectors reset
      fetch(`http://localhost:8000/init-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Fetched session data:", data);
          // Adjust based on the actual JSON structure in your response,
          // where payload.session contains the data
          const session = data.payload?.session || data;
          setSessionData(session);
        })
        .catch(err => console.error('Error fetching session:', err));
    }
  }, [sessionId]);

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <header className="app-header">
      {/* Left — Logo */}
      <div className="header-left">
        <img src="/logolight.jpeg" alt="BookIn Logo" className="logo-img" />
        <span className="logo">BookIn</span>
      </div>

      {/* Center — Search */}
      <HeaderSearch
        onSearch={onSearch}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Right — Model selector */}
      <ModelSelector
        sessionId={sessionId}
        initialModel={sessionData?.model}
        availableModels={sessionData?.models}
        onModelChange={onModelChange}
        onToast={showToast}
      />
      <ThinkingLevelSelector
        sessionId={sessionId}
        initialLevel={sessionData?.thinkingLevel}
        availableLevels={sessionData?.thinkingLevels}
        onLevelChange={onThinkingLevelChange}
        onToast={showToast}
      />

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


