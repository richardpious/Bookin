import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronRight, FiTool } from 'react-icons/fi';

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
    return <span className="opacity-60 font-mono text-slate-500 dark:text-slate-400 font-normal italic"> for "{truncated}"</span>;
  };

  return (
    <div className="my-3 mx-2 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/60 overflow-hidden bg-indigo-50/50 dark:bg-indigo-900/20 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex flex-row flex-nowrap items-center justify-between text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 focus:outline-none transition-colors"
      >
        <span className="flex flex-row items-center gap-2">
          <motion.span animate={{ rotate: isOpen ? 15 : 0 }} transition={{ duration: 0.2 }} className="inline-flex">
            <FiTool className="text-indigo-500" />
          </motion.span>
          <span>Agent executed {tools.length} tool{tools.length !== 1 ? 's' : ''}</span>
        </span>
        <span className="text-indigo-400/80 inline-flex">
          {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-dashed border-indigo-200 dark:border-indigo-800/60 bg-black/5 dark:bg-black/20"
          >
            <div className="py-3 px-2">
              {tools.map((t, idx) => (
                <div key={t.id || idx} className="pl-6 -indent-6 pr-4 py-1.5 text-[12px] font-mono leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold mr-2 select-none">❯ </span>
                  <span className="break-all">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{t.toolName}</span>
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
