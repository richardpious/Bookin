import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ReasoningBlock = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="reasoning-block" style={{ marginBottom: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ width: '100%', padding: '0.5rem', cursor: 'pointer', background: '#f9f9f9', border: 'none', textAlign: 'left', fontWeight: 'bold' }}
      >
        {isOpen ? '▼ Hide Thinking' : '▶ Show Thinking'}
      </button>
      {isOpen && (
        <div style={{ padding: '0.5rem', background: '#fff', fontSize: '0.9rem', color: '#555' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {reasoning}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};
