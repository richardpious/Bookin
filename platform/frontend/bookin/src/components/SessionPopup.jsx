import React from 'react';

export const SessionPopup = ({ show, tempSessionId, setTempSessionId, onDone }) => {
  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>Switch Session</h3>
        <input 
          value={tempSessionId} 
          onChange={(e) => setTempSessionId(e.target.value)} 
          placeholder="Enter session ID" 
        />
        <button onClick={onDone}>Done</button>
      </div>
    </div>
  );
};
