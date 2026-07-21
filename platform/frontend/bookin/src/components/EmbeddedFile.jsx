import React, { useState, useEffect } from 'react';
import { readFileContent } from '../utils/fileUtils';
import { FiFile, FiMaximize2 } from 'react-icons/fi';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';

SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('bash', bash);

export const EmbeddedFile = ({ refPath, title, height }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await readFileContent(refPath);
        if (isMounted) {
          setContent(data.content || '');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFile();
    return () => { isMounted = false; };
  }, [refPath]);

  const getLanguage = (path) => {
    if (!path) return 'text';
    const ext = path.split('.').pop().toLowerCase();
    switch (ext) {
      case 'cpp':
      case 'c':
      case 'h':
      case 'hpp':
        return 'cpp';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'sh':
        return 'bash';
      case 'cfg':
        return 'bash'; // Basic highlighting for config
      default:
        return 'text';
    }
  };

  const containerStyle = {
    marginTop: '12px',
    marginBottom: '12px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    backgroundColor: '#1e1e1e', // Dark theme background
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid #444',
    fontSize: '0.85rem',
    color: '#ccc',
  };

  const contentStyle = {
    maxHeight: height ? `${height}px` : '320px',
    overflowY: 'auto',
    margin: 0,
    fontSize: '0.85rem',
  };

  return (
    <div className="embedded-file" style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiFile size={14} />
          <span>{title || refPath.split('/').pop()}</span>
        </div>
        <div style={{ color: '#888' }}>
           {/* Could add a button to open in full editor later */}
           {refPath}
        </div>
      </div>
      
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading file...</div>
      ) : error ? (
        <div style={{ padding: '20px', color: '#ff6b6b' }}>Failed to load file: {error}</div>
      ) : (
        <div style={contentStyle}>
          <SyntaxHighlighter 
            language={getLanguage(refPath)} 
            style={vscDarkPlus} 
            customStyle={{ margin: 0, background: 'transparent', padding: '12px' }}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
};
