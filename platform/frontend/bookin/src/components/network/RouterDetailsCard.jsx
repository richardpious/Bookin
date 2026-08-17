import React, { useMemo } from 'react';
import { X, Activity, Server, ArrowRightLeft, Database } from 'lucide-react';
import './RouterDetailsCard.css';

export const RouterDetailsCard = ({ routerId, events, meta, onClose }) => {
  const k = meta?.topology?.k || 4;
  const numPorts = meta?.topology?.ports || 5;
  const numVCs = meta?.topology?.vcs || 4;
  const vcBufSize = meta?.topology?.vcBufSize || 8; // If not in meta, assume 8
  
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

  // Find flits at this router
  const activeFlits = useMemo(() => {
    if (!events?.links) return [];
    // A flit is at this router if it's injecting into it, or traversing a link from/to it and is currently associated with it
    // Wait, the VCD gives link traversal, so it tells us flits moving BETWEEN routers.
    // Let's just find flits whose 'from' or 'to' or 'node' is this router.
    return events.links.filter(l => 
      (l.type === 'router' && (l.from === routerId || l.to === routerId)) ||
      (l.type === 'inject' && l.node === routerId)
    );
  }, [events?.links, routerId]);

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

        {/* Active Flits */}
        <div className="rdc-section">
          <div className="rdc-section-header">
            <ArrowRightLeft size={14} />
            <h4>Active Link Traversals</h4>
          </div>
          {activeFlits.length === 0 ? (
            <div className="rdc-empty-state">No flits traversing links at this router in current cycle.</div>
          ) : (
            <div className="rdc-flits-list">
              {activeFlits.map((flit, idx) => (
                <div key={idx} className="rdc-flit-item">
                  <div className="rdc-flit-id">Pkt {flit.pkt} - Flit {flit.flit}</div>
                  <div className="rdc-flit-route">
                    {flit.type === 'inject' ? `Node ${flit.node} → R${flit.node}` : `R${flit.from} → R${flit.to}`}
                  </div>
                  <div className="rdc-flit-type">
                    {flit.head ? 'HEAD' : flit.tail ? 'TAIL' : 'BODY'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
