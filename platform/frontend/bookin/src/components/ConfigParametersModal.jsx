import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import '../index.css'; // ensure styles are imported if needed
import paramDescriptions from '../data/paramDescriptions.json';
import paramOptions from '../data/paramOptions.json';
import paramDependencies from '../data/paramDependencies.json';

export const ConfigParametersModal = ({ isOpen, onClose, onAddParameter }) => {
  const [parameters, setParameters] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredParam, setHoveredParam] = useState(null);
  const [addedStatus, setAddedStatus] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && dropdownRefs.current[activeDropdown] && !dropdownRefs.current[activeDropdown].contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

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

  // Ensure initial inputValues are set when parameters are loaded
  useEffect(() => {
    if (parameters.length > 0) {
      const initialValues = {};
      parameters.forEach(p => {
        initialValues[p.name] = p.defaultValue;
      });
      setInputValues(initialValues);
    }
  }, [parameters]);

  const isVisible = (param) => {
    const dependency = paramDependencies.dependencies[param.name];
    if (!dependency) return true;

    // Use current input value if set, else fallback to param default
    const masterValue = inputValues[dependency.dependsOn] !== undefined
      ? inputValues[dependency.dependsOn]
      : parameters.find(p => p.name === dependency.dependsOn)?.defaultValue;

    if (dependency.showValue === "gt1") {
      return Number(masterValue) > 1;
    }
    return masterValue?.toString() === dependency.showValue;
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
      setSearchTerm(''); // Reset search term when modal opens
      fetch('/config-parameters')
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

  return ReactDOM.createPortal(
    <div
      className={`config-modal-overlay ${isClosing ? 'fade-out' : ''}`}
      onClick={handleOverlayClick}
      style={{ zIndex: 99999999 }}
    >
      <div
        className={`config-modal-container ${isClosing ? 'slide-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="config-modal-header" style={{ flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Configuration Parameters</h2>
          <button onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
                <input
                  type="text"
                  className="param-input"
                  placeholder="Search parameters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                  {parameters
                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .filter(p => isVisible(p))
                    .map((param, i) => {
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
                        <td style={{ position: 'relative' }} ref={el => dropdownRefs.current[param.name] = el}>
                          <input
                            type="text"
                            className="param-input"
                            value={currentValue}
                            onChange={(e) => handleInputChange(param.name, e.target.value)}
                            onFocus={() => paramOptions[param.name] && setActiveDropdown(param.name)}
                          />
                          {activeDropdown === param.name && paramOptions[param.name] && (
                            <div className="model-dropdown" style={{ width: '100%', top: 'calc(100% + 4px)', zIndex: 10 }}>
                              {paramOptions[param.name]
                                .filter(opt => opt.toString().toLowerCase().includes(currentValue.toString().toLowerCase()))
                                .map(opt => (
                                <div
                                  key={opt}
                                  className="model-item"
                                  onClick={() => {
                                    handleInputChange(param.name, opt);
                                    setActiveDropdown(null);
                                  }}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
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
    </div>,
    document.body
  );
};

