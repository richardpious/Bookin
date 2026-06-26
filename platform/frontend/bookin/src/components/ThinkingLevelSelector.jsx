import { useState, useEffect, useRef } from 'react';

export const ThinkingLevelSelector = ({ onLevelChange, sessionId, onToast }) => {
  const [selectedLevel, setSelectedLevel] = useState('medium');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const levels = [
    { id: 'off', name: 'Off' },
    { id: 'low', name: 'Low' },
    { id: 'medium', name: 'Medium' },
    { id: 'high', name: 'High' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLevelSelect = async (level) => {
    setIsOpen(false);
    if (!onLevelChange) return;
    try {
      const result = await onLevelChange(level.id);
      if (result && result.ok === false) {
        if (onToast) onToast(`Error: ${result.error?.message || 'Level switch failed'}`, 'error');
      } else {
        setSelectedLevel(level.id);
        if (onToast) onToast(`Switched to ${level.name} thinking`, 'success');
      }
    } catch (err) {
      if (onToast) onToast(`Failed to switch: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const selectedLevelName = levels.find(l => l.id === selectedLevel)?.name || 'Medium';

  return (
    <div className="header-right" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="nav-item header-model-selector"
        style={{ minWidth: '80px' }}
      >
        {selectedLevelName}
        <span className="arrow">▼</span>
      </div>
      {isOpen && (
        <div className="model-dropdown" style={{ minWidth: '100px' }}>
          {levels.map(level => (
            <div
              key={level.id}
              onClick={() => handleLevelSelect(level)}
              className="model-item"
            >
              {level.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

