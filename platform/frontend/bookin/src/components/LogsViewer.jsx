import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Activity, Clock, Zap, BarChart2, Route, Layers, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { fetchFiles, fetchRunStats } from '../utils/fileUtils';

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
          const isFilesOpen = openFilesDropdown[folder.path];
          const contents = folderContents[folder.path];
          const statsData = folderStats[folder.path];
          
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
                
                {/* Quick badge summary on run row if stats loaded */}
                {statsData?.stats?.cycles && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(100, 181, 246, 0.15)', color: '#90caf9', border: '1px solid rgba(100, 181, 246, 0.3)', fontFamily: 'var(--mono)' }}>
                    {statsData.stats.cycles.toLocaleString()} cycles
                  </span>
                )}
              </div>
              
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                  
                  {/* Statistics Display Card */}
                  {statsData?.stats ? (
                    <div style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '14px' }}>
                        <BarChart2 size={16} color="#81c784" />
                        <span>Run Statistics</span>
                        <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                          Source: {statsData.logFile}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        {statsData.stats.cycles !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={13} color="#64b5f6" /> Execution Cycles
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.cycles.toLocaleString()}
                            </div>
                          </div>
                        )}

                        {statsData.stats.packetLatencyAvg !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Zap size={13} color="#ffd54f" /> Packet Latency Average
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.packetLatencyAvg}
                            </div>
                          </div>
                        )}

                        {statsData.stats.flitLatencyAvg !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Zap size={13} color="#ff8a65" /> Flit Latency Average
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.flitLatencyAvg}
                            </div>
                          </div>
                        )}

                        {statsData.stats.injectedPacketRateAvg !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Activity size={13} color="#81c784" /> Packet Injected Rate
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.injectedPacketRateAvg}
                            </div>
                          </div>
                        )}

                        {statsData.stats.injectedFlitRateAvg !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Activity size={13} color="#4fc3f7" /> Injected Flit Rate
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.injectedFlitRateAvg}
                            </div>
                          </div>
                        )}

                        {statsData.stats.hopsAvg !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Route size={13} color="#ba68c8" /> Average Network Hops
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.hopsAvg}
                            </div>
                          </div>
                        )}

                        {statsData.stats.topology && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Layers size={13} color="#a1887f" /> Network Topology
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.topology}
                            </div>
                          </div>
                        )}

                        {statsData.stats.bufferBusyStallRate !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <AlertTriangle size={13} color="#ef5350" /> Buffer Busy Stall Rate
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.bufferBusyStallRate}
                            </div>
                          </div>
                        )}

                        {statsData.stats.bufferConflictStallRate !== undefined && (
                          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <AlertTriangle size={13} color="#ff7043" /> Buffer Conflict Stall Rate
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--mono)' }}>
                              {statsData.stats.bufferConflictStallRate}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {statsData === undefined ? "Loading statistics..." : "No statistics available in log file."}
                    </div>
                  )}

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
    </div>
  );
};
