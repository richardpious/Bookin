import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, AlertCircle, Loader2, Code, Terminal } from 'lucide-react';
import './ToolAccordion.css';

const ToolAccordion = ({ tools }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOutputs, setExpandedOutputs] = useState({});

  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return null;
  }

  const toggleOutput = (id) => {
    setExpandedOutputs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getToolDescription = (t) => {
    if (!t.toolParams) return null;
    let mainParam = '';

    if (t.toolParams.query) mainParam = t.toolParams.query;
    else if (t.toolParams.CommandLine) mainParam = t.toolParams.CommandLine;
    else if (t.toolParams.command) mainParam = t.toolParams.command;
    else if (t.toolParams.TargetFile) mainParam = t.toolParams.TargetFile;
    else if (t.toolParams.AbsolutePath) mainParam = t.toolParams.AbsolutePath;
    else if (t.toolParams.SearchPath) mainParam = t.toolParams.SearchPath;
    else {
      const strValues = Object.values(t.toolParams).filter(v => typeof v === 'string');
      if (strValues.length > 0) {
        mainParam = strValues[0];
      }
    }

    if (!mainParam) return null;

    const truncated = mainParam.length > 80 ? mainParam.substring(0, 80) + '...' : mainParam;
    return <span className="tool-item-params"> for "{truncated}"</span>;
  };

  const formatData = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'boolean' || typeof val === 'number') return String(val);
    
    if (typeof val === 'object') {
      // 1. Direct text properties
      if (val.output && typeof val.output === 'string' && val.output.trim()) return val.output.trim();
      if (val.stdout && typeof val.stdout === 'string' && val.stdout.trim()) return val.stdout.trim();
      if (val.stderr && typeof val.stderr === 'string' && val.stderr.trim()) return val.stderr.trim();
      if (val.text && typeof val.text === 'string' && val.text.trim()) return val.text.trim();
      if (val.error && typeof val.error === 'string' && val.error.trim()) return val.error.trim();

      // 2. OpenClaw SDK standard content array: [{ type: "text", text: "..." }]
      if (Array.isArray(val.content) && val.content.length > 0) {
        const textParts = val.content
          .map(item => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object') {
              return (item.text || item.content || item.output || '').trim();
            }
            return '';
          })
          .filter(Boolean);
        if (textParts.length > 0) return textParts.join('\n');
      }

      // 3. OpenClaw details object
      if (val.details && typeof val.details === 'object' && val.details !== val) {
        const detailOutput = formatData(val.details);
        if (detailOutput && detailOutput !== '{}') return detailOutput;
      }

      // 4. Nested result object
      if (val.result && typeof val.result === 'object' && val.result !== val) {
        const resOutput = formatData(val.result);
        if (resOutput && resOutput !== '{}') return resOutput;
      }

      // 5. Fallback: Pretty-print full JSON if object has keys
      const keys = Object.keys(val).filter(k => k !== 'status' && k !== 'isError');
      if (keys.length === 0) return null;
      
      try {
        const jsonStr = JSON.stringify(val, null, 2);
        return jsonStr === '{}' ? null : jsonStr;
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  };

  return (
    <div className="tool-accordion">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="tool-accordion-btn"
      >
        <span className="tool-accordion-left">
          <motion.span animate={{ rotate: isOpen ? 15 : 0 }} transition={{ duration: 0.2 }} className="tool-accordion-icon-wrapper">
            <Wrench size={14} className="tool-accordion-icon" />
          </motion.span>
          <span>Agent executed {tools.length} tool{tools.length !== 1 ? 's' : ''}</span>
        </span>
        <span className="tool-accordion-right">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="tool-accordion-content"
          >
            <div className="tool-accordion-list">
              {tools.map((t, idx) => {
                const itemKey = t.id || t.toolCallId || idx;
                const isExpanded = Boolean(expandedOutputs[itemKey]);
                const formattedOutput = formatData(t.toolResult);
                const hasParams = t.toolParams && Object.keys(t.toolParams).length > 0;
                const formattedParams = hasParams ? formatData(t.toolParams) : null;

                return (
                  <div key={itemKey} className="tool-item-container">
                    <div
                      className={`tool-item expandable ${isExpanded ? 'active' : ''}`}
                      onClick={() => toggleOutput(itemKey)}
                    >
                      <span className="tool-item-left">
                        <span className="tool-item-prompt">❯ </span>
                        <span className="tool-item-command-wrapper">
                          <span className="tool-item-command">{t.toolName}</span>
                          {getToolDescription(t)}
                        </span>
                      </span>

                      <span className="tool-item-right">
                        {t.isError ? (
                          <AlertCircle size={13} className="tool-status-icon error" />
                        ) : t.isComplete ? (
                          <CheckCircle2 size={13} className="tool-status-icon success" />
                        ) : (
                          <Loader2 size={13} className="tool-status-icon spinner spin" />
                        )}
                        <span className="tool-output-toggle-btn">
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </span>
                      </span>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="tool-output-wrapper"
                        >
                          {formattedParams && (
                            <div className="tool-section">
                              <div className="tool-section-header">
                                <Code size={11} />
                                <span>Input Parameters</span>
                              </div>
                              <pre className="tool-output-content params">
                                {formattedParams}
                              </pre>
                            </div>
                          )}

                          <div className="tool-section">
                            <div className="tool-section-header">
                              <Terminal size={11} />
                              <span>Execution Output</span>
                            </div>
                            <pre className={`tool-output-content ${t.isError ? 'error' : ''}`}>
                              {formattedOutput || (t.isComplete ? "(Execution completed cleanly)" : "(Execution in progress...)")}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolAccordion;

