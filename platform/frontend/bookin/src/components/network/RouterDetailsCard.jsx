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

export const RouterDetailsCard = ({ routerId, events, meta, onClose }) => {
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

  // Aggregate VC occupancy
  const routerOccs = events?.vc_occ?.filter(v => v.router === routerId) || [];
  const totalOcc = routerOccs.reduce((acc, curr) => acc + curr.occ, 0);
  const maxCapacity = numPorts * numVCs * vcBufSize;
  const occPercentage = maxCapacity > 0 ? (totalOcc / maxCapacity) * 100 : 0;

  // Group by port
  const portStats = useMemo(() => {
    const stats = {};
    for (let i = 0; i < numPorts; i++) {
      stats[i] = { occ: 0, max: numVCs * vcBufSize };
    }
    routerOccs.forEach(v => {
      if (stats[v.port]) {
        stats[v.port].occ += v.occ;
      }
    });
    return stats;
  }, [routerOccs, numPorts, numVCs, vcBufSize]);

  // VCD Advanced Data
  const vcStates = events?.vc_state?.filter(v => v.router === routerId) || [];
  const pipeline = events?.pipeline?.filter(p => p.router === routerId) || [];
  const xbar = events?.xbar?.filter(x => x.router === routerId) || [];

  const renderOverview = () => (
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
            return (
              <div key={port} className="rdc-port-item">
                <div className="rdc-port-label">Port {port}</div>
                <div className="rdc-port-value">{stat.occ}</div>
                <div className="rdc-port-bar-bg">
                  <div className="rdc-port-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div className="rdc-body">
      <div className="rdc-section">
        <div className="rdc-section-header">
          <FastForward size={14} />
          <h4>Pipeline Stages</h4>
        </div>
        {pipeline.length === 0 ? (
          <div className="rdc-empty-state">No pipeline activity in current cycle.</div>
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
                {pipeline.map((p, idx) => {
                  const resStr = PIPE_RESULT[p.result] || 'UNKNOWN';
                  const isStall = resStr.startsWith('STALL');
                  return (
                    <tr key={idx}>
                      <td>{p.input}</td>
                      <td>{p.vc}</td>
                      <td>{p.flit}</td>
                      <td><span className="rdc-badge rdc-badge-stage">{p.stage}</span></td>
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
            {xbar.map((x, idx) => (
              <div key={idx} className="rdc-xbar-item">
                <ArrowRightLeft size={14} className="rdc-xbar-icon" />
                <div className="rdc-xbar-details">
                  <span>In {x.input} (V{x.vc})</span>
                  <span className="rdc-xbar-arrow">→</span>
                  <span>Out {x.output}</span>
                </div>
                <div className="rdc-xbar-flit">Flit {x.flit}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
