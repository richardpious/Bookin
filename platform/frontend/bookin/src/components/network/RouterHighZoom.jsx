import React, { useMemo } from 'react';

// Maps port index to a visual position
// BookSim: 0=East, 1=West, 2=South, 3=North, 4=Local
const PORT_POS = {
  0: { name: 'E', x: 20, y: 0, rx: 1, ry: 0, color: '#3b82f6' },
  1: { name: 'W', x: -20, y: 0, rx: -1, ry: 0, color: '#eab308' },
  2: { name: 'S', x: 0, y: 20, rx: 0, ry: 1, color: '#22c55e' },
  3: { name: 'N', x: 0, y: -20, rx: 0, ry: -1, color: '#ef4444' },
  4: { name: 'L', x: -22, y: -22, rx: -1, ry: -1, angle: -135, color: '#a855f7' }
};

const FILLED_VC_COLOR = '#59e160ff';

export const RouterHighZoom = ({ routerId, events, meta, selectedFlit }) => {
  const numPorts = meta?.topology?.ports || 5;
  const numVCs = meta?.topology?.vcs || 4;
  const vcBufSize = meta?.topology?.vcBufSize || 8;

  const pipeline = events?.pipeline?.filter(p => p.router === routerId) || [];
  const xbar = events?.xbar?.filter(x => x.router === routerId) || [];
  const vcStates = events?.vc_state?.filter(v => v.router === routerId) || [];
  const vcOccs = events?.vc_occ?.filter(v => v.router === routerId) || [];

  // Group VC states and occs by port
  const portData = useMemo(() => {
    const data = {};
    for (let i = 0; i < numPorts; i++) {
      data[i] = {
        vcs: Array.from({ length: numVCs }, () => ({ state: 0, occ: 0, front_flit: -1, has_selected: false, flits: new Set() })),
        pipeline: []
      };
    }

    vcStates.forEach(v => {
      if (data[v.port] && data[v.port].vcs[v.vc]) {
        data[v.port].vcs[v.vc].state = v.state;
        data[v.port].vcs[v.vc].front_flit = v.flit;
        if (v.flit != null && v.flit >= 0) {
          data[v.port].vcs[v.vc].flits.add(v.flit);
        }
        if (selectedFlit != null && v.flit === selectedFlit.flit) {
          data[v.port].vcs[v.vc].has_selected = true;
        }
      }
    });

    vcOccs.forEach(v => {
      if (data[v.port] && data[v.port].vcs[v.vc]) {
        data[v.port].vcs[v.vc].occ = v.occ;
      }
    });

    pipeline.forEach(p => {
      if (data[p.input]) {
        data[p.input].pipeline.push(p);
        if (p.stage !== 'ST' && p.flit != null && p.flit >= 0 && data[p.input].vcs[p.vc]) {
          data[p.input].vcs[p.vc].flits.add(p.flit);
        }
        if (selectedFlit != null && p.flit === selectedFlit.flit && p.stage !== 'ST' && data[p.input].vcs[p.vc]) {
          data[p.input].vcs[p.vc].has_selected = true;
        }
      }
    });

    // Compute effective occ = max(rawOcc, detected flit count)
    for (let i = 0; i < numPorts; i++) {
      for (let j = 0; j < numVCs; j++) {
        const vc = data[i].vcs[j];
        vc.occ = Math.max(vc.occ, vc.flits.size);
      }
    }

    return data;
  }, [vcStates, vcOccs, pipeline, numPorts, numVCs]);

  // Render input buffers for a port
  const renderInputBuffers = (portIdx, data, pos) => {
    const { rx, ry } = pos;
    const isAngled = rx !== 0 && ry !== 0;

    const length = 3;      // Block size along flow direction
    const thickness = 1.5;  // Block size across flow direction
    const spacing = 1.5;    // Inter-VC gap

    if (isAngled) {
      const angle = pos.angle || -135;
      return (
        <g key={`port-${portIdx}`} transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}>
          {/* Port Label (counter-rotated so text remains upright) */}
          <text
            x={-5}
            y={0}
            transform={`rotate(${-angle})`}
            fontSize="3px"
            fill={pos.color}
            textAnchor="middle"
            dominantBaseline="central"
            fontWeight="bold"
          >
            {pos.name}
          </text>

          {/* VCs */}
          {data.vcs.map((vc, vIdx) => {
            const dy = (vIdx - (numVCs - 1) / 2) * (thickness + spacing);

            const blocks = [];
            for (let i = 0; i < vcBufSize; i++) {
              const isFilled = i < vc.occ;
              const bx = i * (length + 0.2);

              blocks.push(
                <rect
                  key={i}
                  x={bx - length / 2}
                  y={dy - thickness / 2}
                  width={length}
                  height={thickness}
                  fill={isFilled ? (vc.has_selected ? '#38bdf8' : FILLED_VC_COLOR) : '#4e4e4eff'}
                  stroke={vc.has_selected && isFilled ? '#7dd3fc' : '#1a1a1a'}
                  strokeWidth="0.2"
                  rx="0.2"
                  style={vc.has_selected && isFilled ? { filter: 'drop-shadow(0 0 1px rgba(56, 189, 248, 0.6))' } : {}}
                />
              );
            }

            return (
              <g key={`vc-${vIdx}`}>
                {blocks}
              </g>
            );
          })}
        </g>
      );
    }

    // Standard non-angled ports (E, W, S, N)
    return (
      <g key={`port-${portIdx}`} transform={`translate(${pos.x}, ${pos.y})`}>
        {/* Port Label */}
        <text
          x={rx * 5}
          y={ry * 5}
          fontSize="3px"
          fill={pos.color}
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          {pos.name}
        </text>

        {/* VCs */}
        {data.vcs.map((vc, vIdx) => {
          let dx = 0;
          let dy = 0;
          if (ry === 0) { // E, W (Horizontal flow)
            dy = (vIdx - (numVCs - 1) / 2) * (thickness + spacing);
          } else { // N, S (Vertical flow)
            dx = (vIdx - (numVCs - 1) / 2) * (thickness + spacing);
          }

          const blocks = [];
          for (let i = 0; i < vcBufSize; i++) {
            const isFilled = i < vc.occ;
            const w = ry === 0 ? length : thickness;
            const h = ry === 0 ? thickness : length;

            let bx = dx;
            let by = dy;

            if (ry === 0) {
              bx += rx * (i * (length + 0.2));
            } else if (rx === 0) {
              by += ry * (i * (length + 0.2));
            }

            blocks.push(
              <rect
                key={i}
                x={bx - w / 2}
                y={by - h / 2}
                width={w}
                height={h}
                fill={isFilled ? (vc.has_selected ? '#38bdf8' : FILLED_VC_COLOR) : '#4e4e4eff'}
                stroke={vc.has_selected && isFilled ? '#7dd3fc' : '#1a1a1a'}
                strokeWidth="0.2"
                rx="0.2"
                style={vc.has_selected && isFilled ? { filter: 'drop-shadow(0 0 1px rgba(56, 189, 248, 0.6))' } : {}}
              />
            );
          }

          return (
            <g key={`vc-${vIdx}`}>
              {blocks}
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <g className="router-high-zoom">
      {/* Background for High Zoom */}
      <rect
        x="-32" y="-32"
        width="64" height="64"
        fill="#0a0a0a"
        stroke="#4a4a4a"
        strokeWidth="0.5"
        rx="2"
      />

      {/* Router ID Label (Top Right) */}
      <text
        x={28}
        y={-26}
        fontSize="3.5px"
        fill="#94a3b8"
        textAnchor="end"
        dominantBaseline="central"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        R{routerId}
      </text>

      {/* Central Crossbar Grid */}
      <rect
        x="-10" y="-10"
        width="20" height="20"
        fill="#141414"
        stroke="#262626"
        strokeWidth="0.5"
      />

      {Array.from({ length: 5 }).map((_, i) => (
        <g key={`grid-${i}`}>
          <line x1="-10" y1={(i - 2) * 4} x2="10" y2={(i - 2) * 4} stroke="#262626" strokeWidth="0.2" />
          <line x1={(i - 2) * 4} y1="-10" x2={(i - 2) * 4} y2="10" stroke="#262626" strokeWidth="0.2" />
        </g>
      ))}

      {/* Active Xbar Connections with Bidirectional & Multi-Lane Separation */}
      {(() => {
        const pairCounts = {};
        const pairIndices = {};

        // Helper to get an unordered key for a pair of ports (e.g. 2-3 and 3-2 get key "2-3")
        const getPairKey = (p1, p2) => {
          const [a, b] = [p1, p2].sort((x, y) => x - y);
          return `${a}-${b}`;
        };

        xbar.forEach(x => {
          const pairKey = getPairKey(x.input, x.output);
          pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
        });

        // Sort xbar so selected flit is drawn last
        const sortedXbar = [...xbar].sort((a, b) => {
          if (selectedFlit != null) {
            if (a.flit === selectedFlit.flit && b.flit !== selectedFlit.flit) return 1;
            if (b.flit === selectedFlit.flit && a.flit !== selectedFlit.flit) return -1;
          }
          return 0;
        });

        return sortedXbar.map((x, idx) => {
          const inPos = PORT_POS[x.input];
          const outPos = PORT_POS[x.output];
          if (!inPos || !outPos) return null;

          const pairKey = getPairKey(x.input, x.output);
          const count = pairCounts[pairKey] || 1;
          const laneIndex = pairIndices[pairKey] || 0;
          pairIndices[pairKey] = laneIndex + 1;

          // Center-relative offset index for this lane
          const offsetIndex = laneIndex - (count - 1) / 2;

          // Determine canonical reference direction for this pair (from lower port index to higher port index)
          const [p1, p2] = [x.input, x.output].sort((a, b) => a - b);
          const pos1 = PORT_POS[p1];
          const pos2 = PORT_POS[p2];

          const p1X = pos1 ? pos1.rx * 10 : 0;
          const p1Y = pos1 ? pos1.ry * 10 : 0;
          const p2X = pos2 ? pos2.rx * 10 : 0;
          const p2Y = pos2 ? pos2.ry * 10 : 0;

          const refDx = p2X - p1X;
          const refDy = p2Y - p1Y;
          const refDist = Math.hypot(refDx, refDy);

          const baseStartX = inPos.rx * 10;
          const baseStartY = inPos.ry * 10;
          const baseEndX = outPos.rx * 10;
          const baseEndY = outPos.ry * 10;

          let startX = baseStartX;
          let startY = baseStartY;
          let endX = baseEndX;
          let endY = baseEndY;
          let controlX = 0;
          let controlY = 0;

          if (refDist > 0.001) {
            // Normal vector perpendicular to reference p1->p2 direction
            const refNx = -refDy / refDist;
            const refNy = refDx / refDist;

            const endpointOffset = 1.2;
            const curveSpread = 4.5;

            // Offset endpoints and control point along canonical normal
            const shiftX = offsetIndex * refNx;
            const shiftY = offsetIndex * refNy;

            startX += endpointOffset * shiftX;
            startY += endpointOffset * shiftY;
            endX += endpointOffset * shiftX;
            endY += endpointOffset * shiftY;

            controlX = curveSpread * shiftX;
            controlY = curveSpread * shiftY;
          } else {
            // Loopback / same port
            controlX = inPos.rx * (5 + offsetIndex * 3);
            controlY = inPos.ry * (5 + offsetIndex * 3);
          }

          const isSelected = selectedFlit != null && x.flit === selectedFlit.flit;

          return (
            <path
              key={`xbar-${idx}`}
              d={`M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`}
              fill="none"
              stroke={isSelected ? '#38bdf8' : '#d1d1d1ff'}
              strokeWidth={isSelected ? "0.8" : "0.35"}
              strokeOpacity={isSelected ? "1.0" : "0.85"}
              strokeLinecap="round"
              style={isSelected ? { filter: 'drop-shadow(0 0 2px rgba(56, 189, 248, 0.8))' } : {}}
            />
          );
        });
      })()}

      {/* Input Buffers */}
      {Object.entries(portData).map(([portIdx, data]) => {
        const pos = PORT_POS[portIdx];
        if (!pos) return null;
        return renderInputBuffers(portIdx, data, pos);
      })}
    </g>
  );
};
