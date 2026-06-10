import { CodeEditor } from './CodeEditor';
import { SimPreview } from './SimPreview';
import { MainContentHome } from './MainContentHome';
import { X } from 'lucide-react';

export const MainContentWindow = ({ openFiles, activeFile, fileContents, onTabClick, onCloseTab }) => {
  if (openFiles.length === 0) {
    return (
      <main className="main-content" style={{ height: '100vh', width: '100%' }}>
        <MainContentHome />
      </main>
    );
  }

  return (
    <main className="main-content" style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
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
      <div style={{ flex: 1, position: 'relative' }}>
        {activeFile && (
          activeFile.startsWith('preview-') ? (
            <SimPreview data={fileContents[activeFile]} />
          ) : (
            <CodeEditor filePath={activeFile} content={fileContents[activeFile]} />
          )
        )}
      </div>
    </main>
  );
};