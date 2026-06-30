import { useState, useEffect, useRef } from 'react';

export const ModelSelector = ({ onModelChange, sessionId, onToast, initialModel, availableModels }) => {
  const [models, setModels] = useState(availableModels || []);
  const [selectedModel, setSelectedModel] = useState(initialModel || '');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (availableModels) setModels(availableModels);
    if (initialModel) setSelectedModel(initialModel);
  }, [initialModel, availableModels]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelSelect = async (model) => {
    setIsOpen(false);
    if (!onModelChange) return;
    try {
      const result = await onModelChange(model.id);
      if (result && result.ok === false) {
        if (onToast) onToast(`Error: ${result.error?.message || 'Model switch failed'}`, 'error');
      } else if (result && result.ok === true) {
        setSelectedModel(model.id);
        if (onToast) onToast(`Switched to ${model.name}`, 'success');
      } else {
        setSelectedModel(model.id);
        if (onToast) onToast(`Switched to ${model.name}`, 'success');
      }
    } catch (err) {
      if (onToast) onToast(`Failed to switch: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const selectedModelName = models.find(m => m.id === selectedModel)?.name || 'Select Model';

  return (
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
                onClick={() => handleModelSelect(model)}
                className="model-item"
              >
                {model.name}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

