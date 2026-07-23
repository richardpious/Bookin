import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';

const ToolAccordion = ({ tools }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return null;
  }

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
              {tools.map((t, idx) => (
                <div key={t.id || idx} className="tool-item">
                  <span className="tool-item-prompt">❯ </span>
                  <span className="tool-item-command-wrapper">
                    <span className="tool-item-command">{t.toolName}</span>
                    {getToolDescription(t)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolAccordion;
