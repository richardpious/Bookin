import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Activity, Clock, BarChart2, ChevronDown, ChevronRight, MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import { fetchFiles, fetchRunStats, deleteItem, renameItem } from '../utils/fileUtils';

export const LogsViewer = ({ session, onFileClick }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Maps folder path to its contents
  const [folderContents, setFolderContents] = useState({});
  // Maps folder path to parsed stats object
  const [folderStats, setFolderStats] = useState({});
  // Maps folder path to boolean (is run open)
  const [openFolders, setOpenFolders] = useState({});
  // Maps folder path to boolean (is files list inside run open)
  const [openFilesDropdown, setOpenFilesDropdown] = useState({});
  
  // 3-dots menu & inline action states
  const [activeMenuFolder, setActiveMenuFolder] = useState(null);
  const [renamingFolderPath, setRenamingFolderPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingFolder, setDeletingFolder] = useState(null);
  
  const basePath = `logs/${session}`;
  
  useEffect(() => {
    const loadFolders = async () => {
      setLoading(true);
      try {
        const items = await fetchFiles(basePath);
        // We only care about directories (run folders) at the top level
        // Sort by modification time, newest first
        const dirs = items.filter(item => item.isDir);
        dirs.sort((a, b) => {
          const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
          const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
          return timeB - timeA;
        });
        setFolders(dirs);
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

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuFolder(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  
  const toggleFolder = async (folderPath) => {
    const isOpen = openFolders[folderPath];
    
    // Toggle run folder open state
    setOpenFolders(prev => ({ ...prev, [folderPath]: !isOpen }));
    
    // Fetch content and stats when opening run folder
    if (!isOpen) {
      if (!folderContents[folderPath]) {
        fetchFiles(folderPath)
          .then(items => setFolderContents(prev => ({ ...prev, [folderPath]: items })))
          .catch(err => console.error("Failed to load folder contents", err));
      }
      if (!folderStats[folderPath]) {
        fetchRunStats(folderPath)
          .then(res => setFolderStats(prev => ({ ...prev, [folderPath]: res })))
          .catch(err => console.error("Failed to load run stats", err));
      }
    }
  };

  const toggleFilesDropdown = (folderPath) => {
    setOpenFilesDropdown(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  const startRename = (folder) => {
    setRenamingFolderPath(folder.path);
    setRenameValue(folder.name);
    setActiveMenuFolder(null);
  };

  const saveRename = async (folder) => {
    if (!renameValue.trim() || renameValue.trim() === folder.name) {
      setRenamingFolderPath(null);
      return;
    }
    try {
      const res = await renameItem(folder.path, renameValue.trim());
      if (res.success) {
        setFolders(prev => prev.map(f => f.path === folder.path ? { ...f, name: res.newName, path: res.newPath } : f));
      }
    } catch (err) {
      alert(`Failed to rename folder: ${err.message}`);
    } finally {
      setRenamingFolderPath(null);
    }
  };

  const confirmDelete = async (folder) => {
    try {
      await deleteItem(folder.path);
      setFolders(prev => prev.filter(f => f.path !== folder.path));
    } catch (err) {
      alert(`Failed to delete folder: ${err.message}`);
    } finally {
      setDeletingFolder(null);
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
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 24px 80px 24px', boxSizing: 'border-box', backgroundColor: 'var(--bg-main)', color: 'var(--text)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '18px', fontWeight: 600, color: 'var(--text-h)' }}>
        <Activity size={20} color="#b0b0b0" />
        Logs for Session: {session}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {folders.map(folder => {
          const isOpen = openFolders[folder.path];
          const isFilesOpen = openFilesDropdown[folder.path];
          const contents = folderContents[folder.path];
          const statsData = folderStats[folder.path];
          const isMenuOpen = activeMenuFolder === folder.path;
          
          return (
            <div 
              key={folder.path} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: '8px', 
                border: '1px solid var(--border)', 
                position: 'relative',
                zIndex: isMenuOpen ? 200 : 1,
                overflow: 'visible'
              }}
            >
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
                  userSelect: 'none',
                  position: 'relative',
                  borderRadius: isOpen ? '8px 8px 0 0' : '8px'
                }}
                onMouseEnter={e => {
                  if (!isOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={e => {
                  if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isOpen ? <FolderOpen size={18} color="#64b5f6" /> : <Folder size={18} color="#64b5f6" />}
                
                {renamingFolderPath === folder.path ? (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="text" 
                      value={renameValue} 
                      onChange={e => setRenameValue(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename(folder);
                        if (e.key === 'Escape') setRenamingFolderPath(null);
                      }}
                      autoFocus
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: 'var(--text-h)',
                        border: '1px solid #64b5f6',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <button onClick={() => saveRename(folder)} style={{ background: 'none', border: 'none', color: '#81c784', cursor: 'pointer', padding: '2px' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setRenamingFolderPath(null)} style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', padding: '2px' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 500, color: 'var(--text-h)', fontSize: '14px' }}>{folder.name}</span>
                )}

                {/* Timestamp */}
                {folder.modifiedAt && (
                  <span style={{
                    marginLeft: 'auto',
                    marginRight: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--mono)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    opacity: 0.8,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    <Clock size={13} color="#90caf9" />
                    {new Date(folder.modifiedAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                )}
                
                {/* 3-Dots Context Menu */}
                <div 
                  style={{ position: 'relative' }} 
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => setActiveMenuFolder(isMenuOpen ? null : folder.path)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Folder options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {isMenuOpen && (
                    <div 
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 4px)',
                        backgroundColor: '#1e1e1e',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
                        zIndex: 9999,
                        overflow: 'hidden',
                        minWidth: '130px'
                      }}
                    >
                      <div 
                        onClick={() => startRename(folder)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Edit2 size={14} color="#64b5f6" />
                        <span>Rename</span>
                      </div>
                      <div 
                        onClick={() => { setDeletingFolder(folder); setActiveMenuFolder(null); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#ff5252',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 82, 82, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={14} color="#ff5252" />
                        <span>Delete</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                  
                  {/* Statistics Display — Grouped Table */}
                  {statsData?.stats ? (() => {
                    const s = statsData.stats;
                    
                    // Helper: create a range entry (avg/min/max) or null
                    const range = (label, prefix) => {
                      if (s[prefix + 'Avg'] === undefined) return null;
                      return { label, avg: s[prefix + 'Avg'], min: s[prefix + 'Min'], max: s[prefix + 'Max'], hasRange: s[prefix + 'Min'] !== undefined };
                    };
                    // Helper: create a simple entry or null
                    const simple = (label, key, fmt) => {
                      if (s[key] === undefined && !s[key]) return null;
                      const val = s[key];
                      if (val === undefined) return null;
                      return { label, avg: fmt ? fmt(val) : val, hasRange: false };
                    };

                    const groups = [
                      {
                        label: 'Overview',
                        color: '#64b5f6',
                        entries: [
                          s.topology && { label: 'Topology', avg: s.topology, hasRange: false },
                          s.traffic && { label: 'Traffic Pattern', avg: s.traffic, hasRange: false },
                          simple('Execution Cycles', 'cycles', v => v.toLocaleString()),
                          simple('Total Run Time', 'totalRunTime', v => `${v}s`),
                          simple('Average Hops', 'hopsAvg'),
                          simple('Injected Packet Size', 'injectedPacketSizeAvg'),
                          simple('Accepted Packet Size', 'acceptedPacketSizeAvg'),
                        ].filter(Boolean)
                      },
                      {
                        label: 'Latency',
                        color: '#ffd54f',
                        entries: [
                          range('Packet Latency', 'packetLatency'),
                          range('Flit Latency', 'flitLatency'),
                          range('Network Latency', 'networkLatency'),
                          range('Fragmentation', 'fragmentation'),
                        ].filter(Boolean)
                      },
                      {
                        label: 'Rates',
                        color: '#81c784',
                        entries: [
                          range('Injected Packet Rate', 'injectedPacketRate'),
                          range('Accepted Packet Rate', 'acceptedPacketRate'),
                          range('Injected Flit Rate', 'injectedFlitRate'),
                          range('Accepted Flit Rate', 'acceptedFlitRate'),
                        ].filter(Boolean)
                      },
                      {
                        label: 'Stalls',
                        color: '#ef5350',
                        entries: [
                          simple('Buffer Busy', 'bufferBusyStallRate'),
                          simple('Buffer Conflict', 'bufferConflictStallRate'),
                          simple('Buffer Full', 'bufferFullStallRate'),
                          simple('Buffer Reserved', 'bufferReservedStallRate'),
                          simple('Crossbar Conflict', 'crossbarConflictStallRate'),
                        ].filter(Boolean)
                      },
                    ].filter(g => g.entries.length > 0);

                    // Check if a group has any range entries (for column headers)
                    const groupHasRange = (group) => group.entries.some(e => e.hasRange);

                    const valStyle = { fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)', fontSize: '12px', textAlign: 'right', minWidth: '60px' };
                    const minMaxStyle = { ...valStyle, fontWeight: 400, color: 'var(--text-secondary)', fontSize: '11px' };

                    return (
                      <div style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '14px' }}>
                          <BarChart2 size={16} color="#81c784" />
                          <span>Run Statistics</span>
                          <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                            Source: {statsData.logFile}
                          </span>
                        </div>

                        {/* Grouped tables in a 2-column grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          {groups.map(group => {
                            const hasRange = groupHasRange(group);
                            return (
                              <div 
                                key={group.label}
                                style={{
                                  borderRadius: '6px',
                                  border: '1px solid rgba(255, 255, 255, 0.06)',
                                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                  overflow: 'hidden'
                                }}
                              >
                                {/* Group header with column labels */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                                }}>
                                  <span style={{ color: group.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {group.label}
                                  </span>
                                  {hasRange && (
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0' }}>
                                      <span style={{ width: '68px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>Avg</span>
                                      <span style={{ width: '68px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 400 }}>Min</span>
                                      <span style={{ width: '68px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 400 }}>Max</span>
                                    </div>
                                  )}
                                </div>

                                {/* Rows */}
                                {group.entries.map((entry, i) => (
                                  <div
                                    key={entry.label}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '7px 12px',
                                      fontSize: '12px',
                                      borderBottom: i < group.entries.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none'
                                    }}
                                  >
                                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{entry.label}</span>
                                    {hasRange && entry.hasRange ? (
                                      <div style={{ display: 'flex', gap: '0' }}>
                                        <span style={{ ...valStyle, width: '68px' }}>{entry.avg}</span>
                                        <span style={{ ...minMaxStyle, width: '68px' }}>{entry.min}</span>
                                        <span style={{ ...minMaxStyle, width: '68px' }}>{entry.max}</span>
                                      </div>
                                    ) : (
                                      <span style={valStyle}>{entry.avg}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : null}

                  {/* Sub-dropdown Accordion Header for Log Files */}
                  <div 
                    onClick={() => toggleFilesDropdown(folder.path)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px 16px', 
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      userSelect: 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                  >
                    {isFilesOpen ? <ChevronDown size={16} color="#90caf9" /> : <ChevronRight size={16} color="#90caf9" />}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-h)' }}>
                      Log & Data Files
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                      {contents ? `${contents.length} files` : '...'}
                    </span>
                  </div>

                  {/* Collapsible File List */}
                  {isFilesOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      {!contents ? (
                        <div style={{ padding: '12px 16px', color: 'var(--text)', fontSize: '13px' }}>Loading files...</div>
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
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingFolder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-h)' }}>
              Delete Run Folder
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete <strong style={{ color: '#fff' }}>{deletingFolder.name}</strong>? This will permanently remove all files in this run from disk.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setDeletingFolder(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => confirmDelete(deletingFolder)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#ff5252',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsViewer;
