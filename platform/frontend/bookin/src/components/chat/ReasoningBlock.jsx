import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ReasoningBlock.css';

export const ReasoningBlock = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="reasoning-accordion">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="reasoning-accordion-btn"
      >
        <span className="reasoning-accordion-left">
          <motion.span
            animate={{ rotate: isOpen ? 15 : 0 }}
            transition={{ duration: 0.2 }}
            className="reasoning-accordion-icon-wrapper"
          >
            <Brain size={14} className="reasoning-accordion-icon" />
          </motion.span>
          <span>Thinking</span>
        </span>
        <span className="reasoning-accordion-right">
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
            className="reasoning-accordion-content"
          >
            <div className="reasoning-accordion-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reasoning}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
