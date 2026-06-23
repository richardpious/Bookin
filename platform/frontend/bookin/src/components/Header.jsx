import { useState, useEffect, useRef } from 'react';

export const Header = ({ onModelChange, sessionId }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const dropdownRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        if (!sessionId) return;
        const response = await fetch(`http://localhost:8000/init-session?session_id=${sessionId}`);
        const data = await response.json();

        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
        if (data.model) {
          setSelectedModel(data.model);
        } else if (data.models && data.models.length > 0) {
          // Fallback to first non-header model
          const firstModel = data.models.find(m => !m.isHeader);
          if (firstModel) setSelectedModel(firstModel.id);
        }
      } catch (err) {
        console.error("Error initializing session:", err);
      }
    };
    initSession();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sessionId]);

  const selectedModelName = models.find(m => m.id === selectedModel)?.name || 'Select Model';

  return (
    <header className="app-header">
      <div className="header-left">
        <img src="/logo.png" alt="BookIn Logo" className="logo-img" />
        <span className="logo">BookIn</span>
      </div>
      <div className="header-right" ref={dropdownRef}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="nav-item header-model-selector"
        >
          {selectedModelName}
          <span className="arrow">▼</span>
        </div>
        {isOpen && (
          <div className="model-dropdown">
            {models.map(model => (
              model.isHeader ? (
                <div key={model.id} className="model-header-item">
                  {model.name}
                </div>
              ) : (
                <div 
                  key={model.id}
                  onClick={async () => {
                    setIsOpen(false);
                    if (onModelChange) {
                      try {
                        const result = await onModelChange(model.id);
                        console.log("Header check result:", result);

                        // Check if result is defined and explicitly contains ok: false
                        // Based on the log format: {'type': 'res', 'id': ..., 'ok': False, 'error': ...}
                        if (result && result.ok === false) {
                          const errorMessage = result.error?.message || 'Model switch failed';
                          showToast(`Error: ${errorMessage}`, 'error');
                        } else if (result && result.ok === true) {
                          setSelectedModel(model.id);
                          showToast(`Successfully switched to ${model.name}`, 'success');
                        } else {
                          // Fallback if the 'ok' property is missing or unexpected
                          console.warn("Unexpected response structure:", result);
                          setSelectedModel(model.id);
                          showToast(`Switched to ${model.name}`, 'success');
                        }
                      } catch (err) {
                        showToast(`Failed to switch: ${err.message || 'Unknown error'}`, 'error');
                      }
                    }
                  }}
                  className="model-item"
                >
                  {model.name}
                </div>
              )
            ))}
          </div>
        )}
      </div>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toastType === 'error' ? 'toast-error' : ''}`}>
            {toast}
          </div>
        </div>
      )}
    </header>
  )
}

