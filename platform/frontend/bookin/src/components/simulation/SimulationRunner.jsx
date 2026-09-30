import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Play, Settings, Cpu, Plus, Trash2, ChevronDown } from 'lucide-react';
import { fetchFiles, readFileContent, updateFileContent, runSimulationAPI, deleteItem } from '../../utils/fileUtils';
import ConfigParametersModal from '../modals/ConfigParametersModal';
import MeshTopologyViz from '../topology/MeshTopologyViz';
import AnynetTopologyViz from '../topology/AnynetTopologyViz';
const AnynetEditorMode = lazy(() => import('../topology/AnynetEditorMode'));
import './SimulationRunner.css';

export const SimulationRunner = ({ sessions, sessionId, onToast, forceCollapseBoth, forceExpandBoth }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [configParams, setConfigParams] = useState({});
  const [committedParams, setCommittedParams] = useState({});
  const [rawContent, setRawContent] = useState('');
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsConfigDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        // Hide indicator if scrolled down more than 50px
        setShowScrollIndicator(containerRef.current.scrollTop < 50);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Check initial state
      handleScroll();
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const loadConfigs = async () => {
      let configDir = 'configs';
      const username = localStorage.getItem('username');
      
      if (username && sessions && sessionId) {
        const currentSession = sessions.find(s => s.id === sessionId);
        if (currentSession) {
          configDir = `logs/${username}/${currentSession.title}/configs`;
        }
      }

      try {
        const files = await fetchFiles(configDir);
        const cfgFiles = files.filter(f => f.name.endsWith('.cfg'));
        setConfigs(cfgFiles);
        if (cfgFiles.length > 0) {
          setSelectedConfig(cfgFiles[0].path);
        }
      } catch (err) {
        console.error(`Failed to load configs from ${configDir}`, err);
      }
    };
    loadConfigs();
  }, [sessions, sessionId]);

  useEffect(() => {
    const loadParams = async () => {
      if (!selectedConfig) return;
      setIsLoadingParams(true);
      try {
        const { content } = await readFileContent(selectedConfig);
        setRawContent(content);
        const params = parseConfig(content);
        setConfigParams(params);
        setCommittedParams(params);
      } catch (err) {
        console.error("Failed to read config", err);
        setConfigParams({});
        setCommittedParams({});
      } finally {
        setIsLoadingParams(false);
      }
    };
    loadParams();
  }, [selectedConfig]);

  const parseConfig = (content) => {
    const params = {};
    const lines = content.split('\n');
    lines.forEach(line => {
      const cleaned = line.split('//')[0].trim();
      if (!cleaned) return;

      const parts = cleaned.split('=');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parts[1].replace(';', '').trim();
        params[key] = value;
      }
    });
    return params;
  };

  const handleParamChange = (key, newValue) => {
    setConfigParams(prev => ({ ...prev, [key]: newValue }));
  };

  const handleBlur = async (key) => {
    const lines = rawContent.split('\n');
    const newLines = lines.map(line => {
      const cleaned = line.split('//')[0].trim();
      if (!cleaned) return line;

      const parts = cleaned.split('=');
      if (parts.length === 2 && parts[0].trim() === key) {
        const commentPart = line.includes('//') ? ' //' + line.split('//').slice(1).join('//') : '';
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1] : '';
        return `${indent}${key} = ${configParams[key]};${commentPart}`;
      }
      return line;
    });

    const newContent = newLines.join('\n');
    setRawContent(newContent);
    // Update committed params only on blur
    setCommittedParams(prev => ({ ...prev, [key]: configParams[key] }));
    
    try {
      await updateFileContent(selectedConfig, newContent);
    } catch (err) {
      console.error("Failed to update config file", err);
      if (onToast) onToast('Failed to save parameter: ' + key, 'error');
    }
  };

  const handleAddParameter = async (param) => {
    const key = param.name;
    const value = param.defaultValue;

    setConfigParams(prev => ({ ...prev, [key]: value }));
    setCommittedParams(prev => ({ ...prev, [key]: value }));

    let keyExists = false;
    const lines = rawContent.split('\n');
    const newLines = lines.map(line => {
      const cleaned = line.split('//')[0].trim();
      if (!cleaned) return line;

      const parts = cleaned.split('=');
      if (parts.length === 2 && parts[0].trim() === key) {
        keyExists = true;
        const commentPart = line.includes('//') ? ' //' + line.split('//').slice(1).join('//') : '';
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1] : '';
        return `${indent}${key} = ${value};${commentPart}`;
      }
      return line;
    });

    if (!keyExists) {
      newLines.push(`${key} = ${value};`);
    }

    const newContent = newLines.join('\n');
    setRawContent(newContent);
    try {
      await updateFileContent(selectedConfig, newContent);
    } catch (err) {
      console.error("Failed to update config file", err);
      if (onToast) onToast('Failed to add parameter: ' + key, 'error');
    }
  };

  const handleDeleteParameter = async (key) => {
    // 1. Update local state
    const newParams = { ...configParams };
    delete newParams[key];
    setConfigParams(newParams);
    
    const newCommittedParams = { ...committedParams };
    delete newCommittedParams[key];
    setCommittedParams(newCommittedParams);

    // 2. Remove from raw content
    const lines = rawContent.split('\n');
    const newLines = lines.filter(line => {
      const cleaned = line.split('//')[0].trim();
      if (!cleaned) return true; // keep empty lines and pure comments

      const parts = cleaned.split('=');
      // If this line defines the parameter, remove it by returning false
      if (parts.length === 2 && parts[0].trim() === key) {
        return false;
      }
      return true;
    });

    const newContent = newLines.join('\n');
    setRawContent(newContent);
    try {
      await updateFileContent(selectedConfig, newContent);
      if (onToast) onToast(`Deleted parameter: ${key}`, 'success');
    } catch (err) {
      console.error("Failed to update config file", err);
      if (onToast) onToast('Failed to delete parameter: ' + key, 'error');
    }
  };

  const openCreateModal = () => {
    setNewConfigName('');
    setIsCreateModalOpen(true);
  };

  const submitCreateConfig = async () => {
    let filename = newConfigName;
    if (!filename) return;
    
    filename = filename.trim();
    if (!filename.endsWith('.cfg')) {
      filename += '.cfg';
    }
    
    // Check for invalid characters (basic check)
    if (/[^a-zA-Z0-9_\-\.]/.test(filename)) {
      if (onToast) onToast('Invalid filename. Use alphanumeric characters, dashes, and underscores.', 'error');
      return;
    }

    const username = localStorage.getItem('username');
    if (!username || !sessions || !sessionId) {
      if (onToast) onToast('Cannot create config outside of an active session.', 'error');
      return;
    }

    const currentSession = sessions.find(s => s.id === sessionId);
    if (!currentSession) return;

    const configDir = `logs/${username}/${currentSession.title}/configs`;
    const newConfigPath = `${configDir}/${filename}`;

    // Check if it already exists in the current list
    if (configs.find(c => c.name === filename)) {
      if (onToast) onToast('A configuration with this name already exists.', 'error');
      return;
    }

    const defaultContent = `topology = mesh;\nk = 4;\nn = 2;\nrouting_function = dim_order;\n`;

    try {
      await updateFileContent(newConfigPath, defaultContent);
      
      // Update local state to include the new config
      const newConfigObj = {
        name: filename,
        path: newConfigPath,
        isDir: false,
        modifiedAt: new Date().toISOString()
      };
      
      setConfigs(prev => [...prev, newConfigObj]);
      setSelectedConfig(newConfigPath);
      setIsCreateModalOpen(false);
      if (onToast) onToast(`Created new config: ${filename}`, 'success');
    } catch (err) {
      console.error("Failed to create config file", err);
      if (onToast) onToast(`Failed to create config file: ${err.message}`, 'error');
    }
  };

  const confirmDeleteConfig = async () => {
    if (!configToDelete) return;
    try {
      await deleteItem(configToDelete.path);
      
      const newConfigs = configs.filter(c => c.path !== configToDelete.path);
      setConfigs(newConfigs);
      
      if (selectedConfig === configToDelete.path) {
        if (newConfigs.length > 0) {
          setSelectedConfig(newConfigs[0].path);
        } else {
          setSelectedConfig('');
          setRawContent('');
          setConfigParams({});
          setCommittedParams({});
        }
      }
      
      if (onToast) onToast(`Deleted config: ${configToDelete.name}`, 'success');
    } catch (err) {
      console.error("Failed to delete config file", err);
      if (onToast) onToast(`Failed to delete config: ${err.message}`, 'error');
    } finally {
      setConfigToDelete(null);
    }
  };

  const handleRun = async () => {
    if (!selectedConfig) return;
    const username = localStorage.getItem('username');
    if (!username) {
      if (onToast) onToast("Error: Username not found.", 'error');
      return;
    }
    
    let sessionName = 'manual';
    if (sessions && sessionId) {
      const currentSession = sessions.find(s => s.id === sessionId);
      if (currentSession) {
        sessionName = currentSession.title;
      }
    }

    setIsRunning(true);
    try {
      const response = await runSimulationAPI(selectedConfig, username, sessionName);
      if (onToast) onToast(`Simulation started in ${response.run_directory}! The UI will automatically notify you when it completes.`, 'success');
    } catch (err) {
      if (onToast) onToast(`Failed to start simulation: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleScrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: window.innerHeight / 2, behavior: 'smooth' });
    }
  };

  const enterEditMode = () => {
    setIsEditorMode(true);
    if (forceCollapseBoth) forceCollapseBoth();
  };

  const exitEditMode = () => {
    setIsEditorMode(false);
    if (forceExpandBoth) forceExpandBoth();
  };

  const handleEditorDone = async (anynetContent, layoutData) => {
    // 1. Determine save path
    const username = localStorage.getItem('username');
    if (!username || !sessions || !sessionId) {
      if (onToast) onToast('Cannot save: no active session.', 'error');
      return;
    }
    const currentSession = sessions.find(s => s.id === sessionId);
    if (!currentSession) return;

    const configDir = `logs/${username}/${currentSession.title}/configs`;
    const anynetFilename = 'custom_topology.anynet';
    const anynetPath = `${configDir}/${anynetFilename}`;
    const layoutPath = `${anynetPath}.layout.json`;

    try {
      // 2. Save the anynet file and layout JSON
      await updateFileContent(anynetPath, anynetContent);
      if (layoutData) {
        await updateFileContent(layoutPath, JSON.stringify(layoutData, null, 2));
      }

      // 3. Update the current config to use anynet topology
      if (selectedConfig) {
        const { content } = await readFileContent(selectedConfig);
        let newContent = content;

        // Helper to set a param in the config content
        const setParam = (c, key, value) => {
          const regex = new RegExp(`^(\\s*)${key}\\s*=.*$`, 'm');
          if (regex.test(c)) {
            return c.replace(regex, `$1${key} = ${value};`);
          } else {
            return c + `\n${key} = ${value};\n`;
          }
        };

        // Helper to remove a param from the config content
        const removeParam = (c, key) => {
          const regex = new RegExp(`^\\s*${key}\\s*=.*\\n?`, 'gm');
          return c.replace(regex, '');
        };

        newContent = setParam(newContent, 'topology', 'anynet');
        newContent = setParam(newContent, 'network_file', anynetPath);
        newContent = setParam(newContent, 'routing_function', 'min');
        // Remove mesh-specific params that don't apply to anynet
        newContent = removeParam(newContent, 'k');
        newContent = removeParam(newContent, 'n');

        await updateFileContent(selectedConfig, newContent);

        // 4. Reload params
        setRawContent(newContent);
        const params = parseConfig(newContent);
        setConfigParams(params);
        setCommittedParams(params);
      }

      if (onToast) onToast('Custom topology saved! Config updated to use anynet.', 'success');
    } catch (err) {
      console.error('Failed to save anynet topology', err);
      if (onToast) onToast('Failed to save topology: ' + err.message, 'error');
    }

    exitEditMode();
  };

  const currentTopology = committedParams.topology?.replace(/^"|"$/g, '').trim().toLowerCase();
  const isAnynet = currentTopology === 'anynet';

  const getAnynetPath = () => {
    if (!committedParams.network_file) return null;
    let file = committedParams.network_file.replace(/^"|"$/g, '').trim();
    if (!file) return null;
    if (!file.startsWith('/') && !file.startsWith('configs/') && !file.startsWith('logs/') && !file.startsWith('booksim/') && !file.startsWith('docs/')) {
      if (selectedConfig && selectedConfig.includes('/')) {
        const dir = selectedConfig.substring(0, selectedConfig.lastIndexOf('/'));
        file = `${dir}/${file}`;
      }
    }
    return file;
  };

  return (
    <div className="simulation-runner-container" ref={containerRef}>
      <div className="simulation-header">
        <h2>Run Simulation</h2>
      </div>

      <div className="simulation-content">
        <div className="simulation-card">
          <div className="simulation-card-header">
            <Settings size={20} />
            <h3>Configuration</h3>
          </div>
          <div className="simulation-card-body">
            <div className="form-group">
              <label>Select Configuration File</label>
              <div className="config-select-group">
                <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
                  <div 
                    className="custom-select" 
                    onClick={() => setIsConfigDropdownOpen(!isConfigDropdownOpen)}
                  >
                    <span>{configs.find(c => c.path === selectedConfig)?.name || 'Select a config'}</span>
                    <span className="arrow">▼</span>
                  </div>
                  {isConfigDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {configs.map(c => (
                        <div
                          key={c.path}
                          className={`custom-select-item ${c.path === selectedConfig ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedConfig(c.path);
                            setIsConfigDropdownOpen(false);
                          }}
                        >
                          <span className="config-name">{c.name}</span>
                          <button 
                            className="delete-config-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigToDelete(c);
                              setIsConfigDropdownOpen(false);
                            }}
                            title="Delete configuration"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  className="create-config-btn" 
                  onClick={openCreateModal}
                  title="Create new configuration file"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="simulation-card flex-1">
          <div className="simulation-card-header">
            <Cpu size={20} />
            <h3>Parameters</h3>
          </div>
          <div className="simulation-card-body parameters-body">
            {isLoadingParams ? (
              <p className="placeholder-text">Loading parameters...</p>
            ) : Object.keys(configParams).length > 0 ? (
              <div className="params-grid">
                {Object.entries(configParams).map(([key, value]) => (
                  <div key={key} className="param-item">
                    <div className="param-item-header">
                      <span className="param-key">{key}</span>
                      <button 
                        className="delete-param-btn" 
                        onClick={() => handleDeleteParameter(key)}
                        title="Delete parameter"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      className="param-input"
                      value={value}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      onBlur={() => handleBlur(key)}
                    />
                  </div>
                ))}
                <div 
                  className="param-item add-param-item" 
                  onClick={() => setIsConfigModalOpen(true)}
                  title="Add parameter"
                >
                  <Plus size={24} />
                  <span>Add Parameter</span>
                </div>
              </div>
            ) : (
              <p className="placeholder-text">No parameters found or file empty.</p>
            )}
          </div>
        </div>

        {isAnynet ? (
          <AnynetTopologyViz
            anynetFilePath={getAnynetPath()}
            onEnterEditMode={enterEditMode}
            showEditButton={true}
          />
        ) : (
          (committedParams.k && committedParams.n || !committedParams.topology || currentTopology === 'mesh' || currentTopology === 'torus') && (
            <MeshTopologyViz
              k={parseInt(committedParams.k) || 4}
              n={parseInt(committedParams.n) || 2}
              onEnterEditMode={enterEditMode}
              showEditButton={true}
            />
          )
        )}
      </div>

      <div className="simulation-actions">
        <button
          className={`run-button ${isRunning ? 'running' : ''}`}
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <div className="spinner"></div>
              Running Simulation...
            </>
          ) : (
            <>
              <Play size={18} />
              Start Simulation
            </>
          )}
        </button>
      </div>

      <ConfigParametersModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
        onAddParameter={handleAddParameter} 
      />

      {isCreateModalOpen && (
        <div className="create-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="create-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>New Configuration</h3>
            <input 
              type="text" 
              placeholder="e.g., my_config" 
              value={newConfigName} 
              onChange={(e) => setNewConfigName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreateConfig()}
              autoFocus
            />
            <div className="create-modal-actions">
              <button className="create-modal-btn secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button className="create-modal-btn primary" onClick={submitCreateConfig}>Create</button>
            </div>
          </div>
        </div>
      )}

      {configToDelete && (
        <div className="create-modal-overlay" onClick={() => setConfigToDelete(null)}>
          <div className="create-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Configuration</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Are you sure you want to delete <strong>{configToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="create-modal-actions">
              <button className="create-modal-btn secondary" onClick={() => setConfigToDelete(null)}>Cancel</button>
              <button 
                className="create-modal-btn primary" 
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={confirmDeleteConfig}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`scroll-down-indicator ${showScrollIndicator ? 'visible' : 'hidden'}`} onClick={handleScrollDown}>
        <ChevronDown size={24} className="bounce" />
      </div>

      {isEditorMode && (
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', zIndex: 40 }}>Loading editor...</div>}>
          <AnynetEditorMode
            initialK={parseInt(committedParams.k) || 4}
            initialN={parseInt(committedParams.n) || 2}
            anynetFilePath={isAnynet ? getAnynetPath() : null}
            onDone={handleEditorDone}
            onCancel={exitEditMode}
            onToast={onToast}
          />
        </Suspense>
      )}
    </div>
  );
};
