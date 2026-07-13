import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Activity } from 'lucide-react';
import { fetchFiles } from '../utils/fileUtils';

export const LogsViewer = ({ session, onFileClick }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Maps folder path to its contents
  const [folderContents, setFolderContents] = useState({});
  // Maps folder path to boolean (is open)
  const [openFolders, setOpenFolders] = useState({});
  
  const basePath = `logs/${session}`;
  
  useEffect(() => {
    const loadFolders = async () => {
      setLoading(true);
      try {
        const items = await fetchFiles(basePath);
        // We only care about directories (run folders) at the top level
        setFolders(items.filter(item => item.isDir));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (session) {
      loadFolders();
    }
  }, [basePath, session]);
  
  const toggleFolder = async (folderPath) => {
    const isOpen = openFolders[folderPath];
    
    // Toggle open state
    setOpenFolders(prev => ({ ...prev, [folderPath]: !isOpen }));
    
    // If we're opening it and haven't fetched contents yet
    if (!isOpen && !folderContents[folderPath]) {
      try {
        const items = await fetchFiles(folderPath);
        setFolderContents(prev => ({ ...prev, [folderPath]: items }));
      } catch (err) {
        console.error("Failed to load folder contents", err);
      }
    }
  };
  
  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading logs...</div>;
  }
  
  if (error) {
    return <div style={{ padding: '20px', color: '#ff4444' }}>Error: {error}</div>;
  }
  
  if (folders.length === 0) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>No run folders found for session: {session}</div>;
  }
  
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', backgroundColor: 'var(--bg-main)', color: 'var(--text)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '18px', fontWeight: 600, color: 'var(--text-h)' }}>
        <Activity size={20} color="#b0b0b0" />
        Logs for Session: {session}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {folders.map(folder => {
          const isOpen = openFolders[folder.path];
          const contents = folderContents[folder.path];
          
          return (
            <div key={folder.path} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleFolder(folder.path)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '14px 16px', 
                  cursor: 'pointer',
                  backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  transition: 'background-color 0.2s',
                  userSelect: 'none'
                }}
                onMouseEnter={e => {
                  if (!isOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={e => {
                  if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isOpen ? <FolderOpen size={18} color="#64b5f6" /> : <Folder size={18} color="#64b5f6" />}
                <span style={{ fontWeight: 500, color: 'var(--text-h)', fontSize: '14px' }}>{folder.name}</span>
              </div>
              
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                  {!contents ? (
                    <div style={{ padding: '12px 16px', color: 'var(--text)', fontSize: '13px' }}>Loading...</div>
                  ) : contents.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: 'var(--text)', fontSize: '13px' }}>Empty folder</div>
                  ) : (
                    contents.map(file => (
                      <div 
                        key={file.path}
                        onClick={() => !file.isDir && onFileClick(file.path)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 16px 10px 44px',
                          cursor: file.isDir ? 'default' : 'pointer',
                          color: 'var(--text)',
                          fontSize: '13px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          if (!file.isDir) {
                            e.currentTarget.style.color = 'var(--text-h)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!file.isDir) {
                            e.currentTarget.style.color = 'var(--text)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {file.isDir ? <Folder size={14} color="#64b5f6" /> : <FileText size={14} color="#81c784" />}
                        <span style={{ fontFamily: 'var(--mono)' }}>{file.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
