import { useState, useEffect, useRef } from 'react';

export const Header = ({ onModelChange, sessionId }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/logo.png" alt="BookIn Logo" style={{ height: '24px', marginRight: '10px' }} />
        <span className="logo">BookIn</span>
      </div>
      <div className="header-right" ref={dropdownRef} style={{ position: 'relative' }}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="nav-item"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {selectedModelName}
          <span style={{ marginLeft: '6px' }}>▼</span>
        </div>
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            boxShadow: 'var(--shadow)',
            zIndex: 1000,
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {models.map(model => (
              model.isHeader ? (
                <div key={model.id} style={{
                  padding: '4px 12px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  background: 'var(--code-bg)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase'
                }}>
                  {model.name}
                </div>
              ) : (
                <div 
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsOpen(false);
                    if (onModelChange) onModelChange(model.id);
                  }}
                  style={{
                    padding: '4px 12px',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--border)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  {model.name}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

