import { useState } from 'react';
import { HeaderSearch } from './HeaderSearch';
import { ModelSelector } from './ModelSelector';

export const Header = ({ onModelChange, sessionId, onSearch }) => {
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

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
        onModelChange={onModelChange}
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

