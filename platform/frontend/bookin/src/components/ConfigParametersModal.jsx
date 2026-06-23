import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../index.css'; // ensure styles are imported if needed
import paramDescriptions from '../data/paramDescriptions.json';

export const ConfigParametersModal = ({ isOpen, onClose, onAddParameter }) => {
  const [parameters, setParameters] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredParam, setHoveredParam] = useState(null);
  const [addedStatus, setAddedStatus] = useState({});
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    // Reset isClosing after animation finishes to allow re-opening
      setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleOverlayClick = (e) => {
    // Check if the clicked target is the overlay div itself
    if (e.target.classList.contains('config-modal-overlay')) {
      handleClose();
    }
  };

  const handleInputChange = (name, value) => {
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = (param, value) => {
    if (param.type === 'integer') {
      if (value.toString().trim() === '' || isNaN(value) || !Number.isInteger(Number(value))) {
        alert(`Invalid value for ${param.name}. Expected an integer.`);
        return;
      }
    } else if (param.type === 'float') {
      if (value.toString().trim() === '' || isNaN(value)) {
        alert(`Invalid value for ${param.name}. Expected a float.`);
        return;
      }
    }

    if (onAddParameter) {
      onAddParameter({ ...param, defaultValue: value });

      setAddedStatus(prev => ({ ...prev, [param.name]: true }));
      setTimeout(() => {
        setAddedStatus(prev => ({ ...prev, [param.name]: false }));
      }, 1500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      fetch('http://localhost:8000/config-parameters')
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setParameters(data.parameters || []);
          }
        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`config-modal-overlay ${isClosing ? 'fade-out' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`config-modal-container ${isClosing ? 'slide-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="config-modal-header">
          <h2>Configuration Parameters</h2>
          <button onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="config-modal-body">
          {loading && <div>Loading parameters...</div>}
          {error && <div style={{ color: '#ef4444' }}>Error: {error}</div>}
          {!loading && !error && parameters.length > 0 && (
            <table className="config-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th style={{ width: '60px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param, i) => {
                  const currentValue = inputValues[param.name] !== undefined ? inputValues[param.name] : param.defaultValue;
                  return (
                    <tr key={i}>
                      <td
                        className="param-name"
                        onMouseEnter={() => setHoveredParam(param.name)}
                        onMouseLeave={() => setHoveredParam(null)}
                      >
                        {param.name}
                        {hoveredParam === param.name && paramDescriptions[param.name] && (
                          <div className="tooltip">
                            {paramDescriptions[param.name]}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="param-input"
                          value={currentValue}
                          onChange={(e) => handleInputChange(param.name, e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {addedStatus[param.name] ? (
                          <span className="added-text">Added!</span>
                        ) : (
                          <button
                            className="add-btn"
                            onClick={() => handleAdd(param, currentValue)}
                          >
                            +
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!loading && !error && parameters.length === 0 && (
            <div>No parameters found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

