import { useState, Suspense, lazy } from 'react';
import { MainContentHome } from './MainContentHome';
import { X, List, Play } from 'lucide-react';

const CodeEditor = lazy(() => import('./CodeEditor'));
const LogsViewer = lazy(() => import('./LogsViewer'));
const ConfigParametersModal = lazy(() => import('./ConfigParametersModal'));

export const MainContentWindow = ({ openFiles, activeFile, activeLine, fileContents, savedFileContents, onTabClick, onCloseTab, onUpdateFile, onEditContent, onFileClick, onSendMessage, onAddMessage, onToast }) => {
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
        {openFiles.map(path => {
          const isDirty = fileContents[path] !== savedFileContents[path];
          return (
            <div
              key={path}
              onClick={() => onTabClick(path)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  onCloseTab(e, path);
                }
              }}
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
              {isDirty && <span style={{ color: '#ffcc00', fontSize: '10px' }}>●</span>}
              {path.startsWith('logs-viewer:') ? 'Logs' : path.split('/').pop()}
              <X size={14} onClick={(e) => onCloseTab(e, path)} style={{ cursor: 'pointer', opacity: 0.6 }} />
            </div>
          )
        })}
      </div>
      <div style={{ flex: 1, position: 'relative', overflowY: 'hidden' }}>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>Loading...</div>}>
        {activeFile && activeFile.startsWith('logs-viewer:') ? (
          <LogsViewer session={activeFile.split(':')[1]} onFileClick={onFileClick} />
        ) : activeFile ? (
          <CodeEditor
            filePath={activeFile}
            activeLine={activeLine}
            content={fileContents[activeFile]}
            onFileClick={onFileClick}
            onToast={onToast}
            onEditContent={onEditContent}
            onUpdateFile={onUpdateFile}
          />
        ) : null}
        </Suspense>
        {activeFile && !activeFile.toLowerCase().endsWith('.md') && activeFile.endsWith('.cfg') && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            zIndex: 50,
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => {
                onSendMessage(`proceed with the simulation and give me the results(this includes the statistics, such as latency, injection rate, stalls, etc.). you have my approval.`, { silent: true });
                onAddMessage('Starting simulation...');
              }}
              style={{
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
              <Play size={16} />
              Run Simulation
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
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
          </div>
        )}
      </div>
      <Suspense fallback={null}>
      <ConfigParametersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddParameter={(param) => {
          const currentContent = fileContents[activeFile] || '';
          const newLine = `${param.name} = ${param.defaultValue || '""'};`;
          // Match an existing line for this parameter (handles optional spaces around '=')
          const regex = new RegExp(`^${param.name}\\s*=.*$`, 'm');
          let newContent;
          if (regex.test(currentContent)) {
            // Replace the existing line in-place
            newContent = currentContent.replace(regex, newLine);
          } else {
            // Parameter not present — append it
            newContent = currentContent + (currentContent && !currentContent.endsWith('\n') ? '\n' : '') + newLine + '\n';
          }
          onUpdateFile(activeFile, newContent);
        }}
      />
      </Suspense>
    </main>
  );
};