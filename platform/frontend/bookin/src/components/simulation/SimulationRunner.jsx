import React, { useState, useEffect } from 'react';
import { Play, Settings, Server, Cpu } from 'lucide-react';
import { fetchFiles, readFileContent, updateFileContent, runSimulationAPI } from '../../utils/fileUtils';
import './SimulationRunner.css';

export const SimulationRunner = ({ sessions, sessionId, onToast }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [configParams, setConfigParams] = useState({});
  const [rawContent, setRawContent] = useState('');
  const [isLoadingParams, setIsLoadingParams] = useState(false);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const files = await fetchFiles('configs');
        const cfgFiles = files.filter(f => f.name.endsWith('.cfg'));
        setConfigs(cfgFiles);
        if (cfgFiles.length > 0) {
          setSelectedConfig(cfgFiles[0].path);
        }
      } catch (err) {
        console.error("Failed to load configs", err);
      }
    };
    loadConfigs();
  }, []);

  useEffect(() => {
    const loadParams = async () => {
      if (!selectedConfig) return;
      setIsLoadingParams(true);
      try {
        const { content } = await readFileContent(selectedConfig);
        setRawContent(content);
        const params = parseConfig(content);
        setConfigParams(params);
      } catch (err) {
        console.error("Failed to read config", err);
        setConfigParams({});
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
    try {
      await updateFileContent(selectedConfig, newContent);
    } catch (err) {
      console.error("Failed to update config file", err);
      if (onToast) onToast('Failed to save parameter: ' + key, 'error');
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

  return (
    <div className="simulation-runner-container">
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
              <select
                value={selectedConfig}
                onChange={(e) => setSelectedConfig(e.target.value)}
                className="config-select"
              >
                {configs.map(c => (
                  <option key={c.path} value={c.path}>{c.name}</option>
                ))}
              </select>
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
                    <span className="param-key">{key}</span>
                    <input
                      type="text"
                      className="param-input"
                      value={value}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      onBlur={() => handleBlur(key)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="placeholder-text">No parameters found or file empty.</p>
            )}
          </div>
        </div>
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
    </div>
  );
};
