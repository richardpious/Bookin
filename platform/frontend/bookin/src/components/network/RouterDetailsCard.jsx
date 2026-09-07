import React, { useMemo, useState } from 'react';
import { X, Activity, Server, ArrowRightLeft, Database, Layers, FastForward } from 'lucide-react';
import './RouterDetailsCard.css';

const STATE_MAP = {
  0: 'IDLE',
  1: 'ROUTING',
  2: 'VC_ALLOC',
  3: 'ACTIVE'
};

const PIPE_RESULT = {
  0: 'NONE',
  1: 'SUCCESS',
  2: 'STALL_BUSY',
  3: 'STALL_CONFLICT',
  4: 'STALL_FULL',
  5: 'STALL_RESERVED',
  6: 'MISSPEC'
};

export const RouterDetailsCard = ({ routerId, events, meta, selectedFlit, onFlitSelect, onClose }) => {
  const k = meta?.topology?.k || 4;
  const numPorts = meta?.topology?.ports || 5;
  const numVCs = meta?.topology?.vcs || 4;
  const vcBufSize = meta?.topology?.vcBufSize || 8; // If not in meta, assume 8
  
  const [activeTab, setActiveTab] = useState('overview');

  const routerCoords = useMemo(() => {
    if (k <= 0) return { x: 0, y: 0 };
    return {
      x: routerId % k,
      y: Math.floor(routerId / k)
    };
  }, [routerId, k]);

  // VCD Advanced Data
  const vcStates = events?.vc_state?.filter(v => v.router === routerId) || [];
  const pipeline = events?.pipeline?.filter(p => p.router === routerId) || [];
  const xbar = events?.xbar?.filter(x => x.router === routerId) || [];

  // Compute effective per-VC stats: occupancy = max(rawOcc, detectedFlits)
  // This ensures the count, flit list, and progress bar all agree.
  const effectiveStats = useMemo(() => {
    // Build raw occ lookup from vc_occ events
    const routerOccs = events?.vc_occ?.filter(v => v.router === routerId) || [];
    const rawOccMap = {};
    routerOccs.forEach(v => {
      rawOccMap[`${v.port}-${v.vc}`] = v.occ;
    });

    const portStats = {};
    let totalOcc = 0;

    for (let port = 0; port < numPorts; port++) {
      let portOcc = 0;
      const vcs = {};

      for (let vc = 0; vc < numVCs; vc++) {
        const rawOcc = rawOccMap[`${port}-${vc}`] || 0;

        // Detect flits from VC state and pipeline (same logic as old getFlitsInVC)
        const flits = new Set();
        vcStates.forEach(v => {
          if (v.port === port && v.vc === vc && v.flit != null && v.flit >= 0) {
            flits.add(v.flit);
          }
        });
        pipeline.forEach(p => {
          if (p.input === port && p.vc === vc && p.flit != null && p.flit >= 0 && p.stage !== 'ST') {
            flits.add(p.flit);
          }
        });

        const flitList = Array.from(flits);
        const effOcc = Math.max(rawOcc, flitList.length);
        vcs[vc] = { occ: effOcc, rawOcc, flitList };
        portOcc += effOcc;
      }

      portStats[port] = { occ: portOcc, max: numVCs * vcBufSize, vcs };
      totalOcc += portOcc;
    }

    const maxCapacity = numPorts * numVCs * vcBufSize;
    const occPercentage = maxCapacity > 0 ? (totalOcc / maxCapacity) * 100 : 0;

    return { portStats, totalOcc, maxCapacity, occPercentage };
  }, [events, routerId, numPorts, numVCs, vcBufSize, vcStates, pipeline]);

  const PORT_NAMES = {
    0: 'Port 0 (East)',
    1: 'Port 1 (West)',
    2: 'Port 2 (South)',
    3: 'Port 3 (North)',
    4: 'Port 4 (Local)',
  };

  const renderOverview = () => {
    const { portStats, totalOcc, maxCapacity, occPercentage } = effectiveStats;
    return (
    <div className="rdc-body">
      {/* Overall Buffer Occupancy */}
      <div className="rdc-section">
        <div className="rdc-section-header">
          <Database size={14} />
          <h4>Buffer Occupancy</h4>
        </div>
        <div className="rdc-progress-container">
          <div className="rdc-progress-bar">
            <div 
              className="rdc-progress-fill" 
              style={{ width: `${Math.min(100, occPercentage)}%`, backgroundColor: occPercentage > 80 ? '#ef4444' : occPercentage > 50 ? '#f59e0b' : '#10b981' }} 
            />
          </div>
          <div className="rdc-progress-text">
            <span>{totalOcc} / {maxCapacity} flits</span>
            <span>{occPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Per-Port Breakdown */}
      <div className="rdc-section">
        <div className="rdc-section-header">
          <Activity size={14} />
          <h4>Per-Port Breakdown</h4>
        </div>
        <div className="rdc-ports-grid">
          {Object.entries(portStats).map(([port, stat]) => {
            const pct = stat.max > 0 ? (stat.occ / stat.max) * 100 : 0;
            const portTitle = PORT_NAMES[port] || `Port ${port}`;
            return (
              <div key={port} className="rdc-port-item" style={{ paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div className="rdc-port-label">{portTitle}</div>
                  <div className="rdc-port-value">{stat.occ} flits</div>
                </div>
                <div className="rdc-port-bar-bg" style={{ marginBottom: '8px' }}>
                  <div className="rdc-port-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, numVCs)}, 1fr)`, gap: '6px' }}>
                  {Object.entries(stat.vcs).map(([vc, vcData]) => {
                    const { occ, flitList } = vcData;
                    return (
                      <div key={vc} style={{ backgroundColor: '#171717', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid #262626' }}>
                        <div style={{ fontSize: '10px', color: '#a3a3a3', fontWeight: '500', marginBottom: '2px' }}>VC {vc}</div>
                        <div style={{ fontSize: '12px', color: '#f5f5f5', fontWeight: '600' }}>{occ}</div>
                        {(occ > 0 || flitList.length > 0) && (
                          <div style={{ fontSize: '10px', color: '#60a5fa', marginTop: '3px', fontWeight: '500', wordBreak: 'break-word' }}>
                            {flitList.length > 0 ? flitList.map(f => `F${f}`).join(', ') : 'Occupied'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  };

  const renderPipeline = () => {
    // Build a merged list: active pipeline entries (BW-SA) + idle flits in VCs
    const activePipelineEntries = pipeline.filter(p => p.stage !== 'ST');
    
    // Track which (port, vc, flit) combos are already covered by pipeline events
    const activeFlidKeys = new Set();
    activePipelineEntries.forEach(p => {
      if (p.flit != null && p.flit >= 0) {
        activeFlidKeys.add(`${p.input}-${p.vc}-${p.flit}`);
      }
    });

    // Find flits that are in the VC but not in any active pipeline stage
    const idleEntries = [];
    vcStates.forEach(v => {
      if (v.flit != null && v.flit >= 0 && !activeFlidKeys.has(`${v.port}-${v.vc}-${v.flit}`)) {
        // This flit is the front of the VC but not actively in a pipeline stage
        idleEntries.push({
          input: v.port,
          vc: v.vc,
          flit: v.flit,
          pkt: null,
          stage: 'IDLE',
          result: 0,
          output: null,
          out_vc: null,
        });
      }
    });

    const allEntries = [...activePipelineEntries, ...idleEntries];

    return (
    <div className="rdc-body">
      <div className="rdc-section">
        <div className="rdc-section-header">
          <FastForward size={14} />
          <h4>Pipeline Stages</h4>
        </div>
        {allEntries.length === 0 ? (
          <div className="rdc-empty-state">No flits in buffers in current cycle.</div>
        ) : (
          <div className="rdc-table-wrapper">
            <table className="rdc-table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>VC</th>
                  <th>Flit</th>
                  <th>Stage</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {allEntries.map((p, idx) => {
                  const resStr = PIPE_RESULT[p.result] || 'UNKNOWN';
                  const isStall = resStr.startsWith('STALL');
                  const isIdle = p.stage === 'IDLE';
                  const isHighlighted = selectedFlit && p.flit === selectedFlit.flit && (p.pkt == null || p.pkt === selectedFlit.pkt);
                  return (
                    <tr 
                      key={idx} 
                      className={isHighlighted ? 'rdc-highlight-row' : ''}
                      onClick={() => onFlitSelect && onFlitSelect({ flit: p.flit, pkt: p.pkt })}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{p.input}</td>
                      <td>{p.vc}</td>
                      <td>{p.flit}</td>
                      <td><span className={`rdc-badge ${isIdle ? 'rdc-badge-neutral' : 'rdc-badge-stage'}`}>{p.stage}</span></td>
                      <td><span className={`rdc-badge ${isStall ? 'rdc-badge-warning' : p.result === 1 ? 'rdc-badge-success' : 'rdc-badge-neutral'}`}>{resStr}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rdc-section">
        <div className="rdc-section-header">
          <ArrowRightLeft size={14} />
          <h4>Crossbar Traversals</h4>
        </div>
        {xbar.length === 0 ? (
          <div className="rdc-empty-state">No crossbar activity in current cycle.</div>
        ) : (
          <div className="rdc-xbar-list">
            {xbar.map((x, idx) => {
              const isHighlighted = selectedFlit && x.flit === selectedFlit.flit && x.pkt === selectedFlit.pkt;
              return (
              <div 
                key={idx} 
                className={`rdc-xbar-item ${isHighlighted ? 'rdc-highlight-row' : ''}`}
                onClick={() => onFlitSelect && onFlitSelect({ flit: x.flit, pkt: x.pkt })}
                style={{ cursor: 'pointer' }}
              >
                <ArrowRightLeft size={14} className="rdc-xbar-icon" />
                <div className="rdc-xbar-details">
                  <span>In {x.input} (V{x.vc})</span>
                  <span className="rdc-xbar-arrow">→</span>
                  <span>Out {x.output}</span>
                </div>
                <div className="rdc-xbar-flit">Flit {x.flit}</div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
  };

  const renderVCs = () => {
    // Group VC states by port
    const portGroups = {};
    vcStates.forEach(v => {
      if (!portGroups[v.port]) portGroups[v.port] = [];
      portGroups[v.port].push(v);
    });

    return (
      <div className="rdc-body">
        <div className="rdc-section">
          <div className="rdc-section-header">
            <Layers size={14} />
            <h4>VC States & Allocations</h4>
          </div>
          {Object.keys(portGroups).length === 0 ? (
            <div className="rdc-empty-state">No VC state data available for this cycle.</div>
          ) : (
            <div className="rdc-vc-groups">
              {Object.entries(portGroups).map(([port, vcs]) => (
                <div key={port} className="rdc-vc-port-group">
                  <h5>Input Port {port}</h5>
                  <div className="rdc-table-wrapper">
                    <table className="rdc-table">
                      <thead>
                        <tr>
                          <th>VC</th>
                          <th>State</th>
                          <th>Front Flit</th>
                          <th>Route</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vcs.map((v, idx) => (
                          <tr key={idx}>
                            <td>{v.vc}</td>
                            <td><span className={`rdc-state-badge rdc-state-${v.state}`}>{STATE_MAP[v.state] || 'UNKNOWN'}</span></td>
                            <td>{v.flit >= 0 ? v.flit : '-'}</td>
                            <td>{v.out_port >= 0 ? `P${v.out_port}:V${v.out_vc}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="router-details-card">
      <div className="rdc-header">
        <div className="rdc-header-title">
          <Server size={18} className="rdc-icon" />
          <h3>Router R{routerId}</h3>
          <span className="rdc-coords">({routerCoords.x}, {routerCoords.y})</span>
        </div>
        <button className="rdc-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      
      <div className="rdc-tabs">
        <button className={`rdc-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`rdc-tab ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>Pipeline</button>
        <button className={`rdc-tab ${activeTab === 'vcs' ? 'active' : ''}`} onClick={() => setActiveTab('vcs')}>VC States</button>
      </div>

      <div className="rdc-scrollable-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'pipeline' && renderPipeline()}
        {activeTab === 'vcs' && renderVCs()}
      </div>
    </div>
  );
};
