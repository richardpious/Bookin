import React, { useState, useEffect } from 'react';
import { readFileContent } from '../utils/fileUtils';
import { FileText, Maximize2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

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
    if (!path) return 'plaintext';
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
        return 'shell';
      case 'cfg':
        return 'ini';
      default:
        return 'plaintext';
    }
  };

  const containerStyle = {
    marginTop: '12px',
    marginBottom: '12px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    backgroundColor: '#1e1e1e',
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

  const editorHeight = height ? `${height}px` : '320px';

  return (
    <div className="embedded-file" style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} />
          <span>{title || refPath.split('/').pop()}</span>
        </div>
        <div style={{ color: '#888' }}>
           {refPath}
        </div>
      </div>
      
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading file...</div>
      ) : error ? (
        <div style={{ padding: '20px', color: '#ff6b6b' }}>Failed to load file: {error}</div>
      ) : (
        <Editor
          height={editorHeight}
          language={getLanguage(refPath)}
          value={content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            fontSize: 13,
            padding: { top: 8 },
            domReadOnly: true,
          }}
        />
      )}
    </div>
  );
};
