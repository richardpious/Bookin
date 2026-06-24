import { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { MainContentHome } from './MainContentHome';
import { ConfigParametersModal } from './ConfigParametersModal';
import { X, List } from 'lucide-react';

export const MainContentWindow = ({ openFiles, activeFile, fileContents, onTabClick, onCloseTab, onUpdateFile, onFileClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (openFiles.length === 0) {
    return (
      <main className="main-content" style={{ height: '100%', width: '100%' }}>
        <MainContentHome />
      </main>
    );
  }

  return (
    <main className="main-content" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-light)', overflowX: 'auto', flexShrink: 0 }}>
        {openFiles.map(path => (
          <div
            key={path}
            onClick={() => onTabClick(path)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              background: activeFile === path ? 'var(--bg-main)' : 'transparent',
              borderRight: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: activeFile === path ? 'white' : 'var(--text-secondary)'
            }}
          >
            {path.split('/').pop()}
            <X size={14} onClick={(e) => onCloseTab(e, path)} style={{ cursor: 'pointer', opacity: 0.6 }} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative', overflowY: 'hidden' }}>
        {activeFile && (
          <CodeEditor filePath={activeFile} content={fileContents[activeFile]} onFileClick={onFileClick} />
        )}
        {activeFile && !activeFile.endsWith('.md') && activeFile.endsWith('.cfg') && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              zIndex: 10,
              padding: '8px 16px',
              background: '#4b4b4bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <List size={16} />
            View All Parameters
          </button>
        )}
      </div>
      <ConfigParametersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddParameter={(param) => {
          const currentContent = fileContents[activeFile] || '';
          // Ensure file ends with newline before appending
          const newContent = currentContent + (currentContent && !currentContent.endsWith('\n') ? '\n' : '') + `${param.name} = ${param.defaultValue || '""'};\n`;
          onUpdateFile(activeFile, newContent);
        }}
      />
    </main>
  );
};