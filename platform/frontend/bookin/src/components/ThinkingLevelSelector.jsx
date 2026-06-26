import { useState, useEffect, useRef } from 'react';

export const ThinkingLevelSelector = ({ onLevelChange, sessionId, onToast, initialLevel, availableLevels }) => {
  const [selectedLevel, setSelectedLevel] = useState(initialLevel || 'medium');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Use dynamic levels if provided, otherwise default to hardcoded ones
  const levels = availableLevels && availableLevels.length > 0
    ? availableLevels.map(l => ({ id: l.id, name: l.label.charAt(0).toUpperCase() + l.label.slice(1) }))
    : [
    { id: 'off', name: 'Off' },
    { id: 'low', name: 'Low' },
    { id: 'medium', name: 'Medium' },
    { id: 'high', name: 'High' },
  ];

  // Sync selectedLevel if availableLevels change and current selection is invalid
  useEffect(() => {
    if (initialLevel) {
      setSelectedLevel(initialLevel);
    }
  }, [initialLevel]);

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

  const selectedLevelName = levels.find(l => l.id === selectedLevel)?.name || 'Off';
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

