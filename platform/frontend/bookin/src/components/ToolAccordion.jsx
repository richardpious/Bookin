import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronRight, FiTool } from 'react-icons/fi';

const ToolAccordion = ({ tools }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return null;
  }

  return (
    <div className="my-3 mx-2 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/60 overflow-hidden bg-indigo-50/50 dark:bg-indigo-900/20 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 focus:outline-none transition-colors"
      >
        <div className="flex items-center space-x-2">
          <motion.div animate={{ rotate: isOpen ? 15 : 0 }} transition={{ duration: 0.2 }}>
            <FiTool className="text-indigo-500" />
          </motion.div>
          <span>Agent executed {tools.length} tool{tools.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-indigo-400/80">
          {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-dashed border-indigo-200 dark:border-indigo-800/60"
          >
            {tools.map((t, idx) => (
               <div key={t.id || idx} className="px-4 py-2 border-b border-dashed last:border-b-0 border-indigo-200/60 dark:border-indigo-800/40 text-[11px] font-mono text-gray-600 dark:text-gray-400 flex items-start gap-2">
                 <span className="text-indigo-400 dark:text-indigo-600 select-none mt-[1px]">❯</span>
                 <span className="break-all">{t.toolName}</span>
               </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolAccordion;
