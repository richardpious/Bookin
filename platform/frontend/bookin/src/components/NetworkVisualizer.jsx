import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Info } from 'lucide-react';
import './NetworkVisualizer.css';

// Fixed flit type colors
const FLIT_COLORS = {
  head: '#818cf8',  // indigo
  body: '#38bdf8',  // sky blue
  tail: '#f472b6',  // pink
};

const getFlitColor = (flit) => {
  if (flit.head) return FLIT_COLORS.head;
  if (flit.tail) return FLIT_COLORS.tail;
  return FLIT_COLORS.body;
};

// Map mesh (x, y) router coordinate
const getRouterCoords = (routerId, k, width, height, margin = 80) => {
  if (k <= 0) return { x: width / 2, y: height / 2 };
  const rx = routerId % k;
  const ry = Math.floor(routerId / k);
  
  const stepX = (width - margin * 2) / Math.max(1, k - 1);
  const stepY = (height - margin * 2) / Math.max(1, k - 1);

  return {
    x: margin + rx * stepX,
    y: margin + ry * stepY,
    rx,
    ry
  };
};

const PAGE_SIZE = 200; // Cycles per API request page

export const NetworkVisualizer = ({ filePath }) => {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x, 10x cycles per tick
  const [cycleInput, setCycleInput] = useState('0');

  // Cycle cache: Map<pageNumber, Object>
  const cycleCacheRef = useRef(new Map());
  const [cycleData, setCycleData] = useState({});
  const [fetchingRange, setFetchingRange] = useState(false);

  // Hover & selection states
  const [hoveredFlit, setHoveredFlit] = useState(null);
  const [hoveredRouter, setHoveredRouter] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedRouter, setSelectedRouter] = useState(null);
  const [selectedFlit, setSelectedFlit] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const canvasRef = useRef(null);
  const playTimerRef = useRef(null);

  const updateTooltipPos = useCallback((e) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Sync cycleInput when currentCycle changes and user is not focused on input
  useEffect(() => {
    if (!isInputFocused) {
      setCycleInput(String(currentCycle));
    }
  }, [currentCycle, isInputFocused]);

  // 1. Fetch VCD Metadata on file change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    cycleCacheRef.current.clear();
    setCycleData({});

    fetch(`/api/vcd/meta?path=${encodeURIComponent(filePath)}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.error) {
          setError(data.error);
        } else {
          setMeta(data);
          const start = data.timeline.startCycle;
          setCurrentCycle(start);
          setCycleInput(String(start));
        }
      })
      .catch(err => {
        if (isMounted) setError(err.message || 'Failed to load VCD metadata');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [filePath]);

  const [dataVersion, setDataVersion] = useState(0);

  // 2. Fetch cycle range with prefetching
  const fetchCycles = useCallback(async (targetCycle) => {
    if (!meta) return;

    const page = Math.floor(targetCycle / PAGE_SIZE);
    const pagesToFetch = [page, page + 1]; // fetch current and prefetch next page

    const missingPages = pagesToFetch.filter(p => !cycleCacheRef.current.has(p));
    if (missingPages.length === 0) {
      return; // Data already in cache, zero state churn
    }

    setFetchingRange(true);
    try {
      let newlyLoaded = false;
      for (const p of missingPages) {
        const start = p * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        const res = await fetch(`/api/vcd/cycles?path=${encodeURIComponent(filePath)}&start=${start}&end=${end}`);
        const data = await res.json();
        if (data.cycles) {
          cycleCacheRef.current.set(p, data.cycles);
          newlyLoaded = true;
        }
      }

      if (newlyLoaded) {
        setDataVersion(v => v + 1);
      }
    } catch (err) {
      console.error('Failed to fetch cycle range:', err);
    } finally {
      setFetchingRange(false);
    }
  }, [filePath, meta]);

  // Sync data when currentCycle changes
  useEffect(() => {
    if (meta) {
      fetchCycles(currentCycle);
    }
  }, [currentCycle, meta, fetchCycles]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(50, 200 / speed); // speed scaling
      playTimerRef.current = setInterval(() => {
        setCurrentCycle(prev => {
          if (!meta) return prev;
          const next = prev + 1;
          if (next > meta.timeline.endCycle) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speed, meta]);

  // Handle direct cycle input submit & blur
  const handleCycleSubmit = (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(cycleInput, 10);
      if (!isNaN(val) && meta) {
        const clamped = Math.max(meta.timeline.startCycle, Math.min(meta.timeline.endCycle, val));
        setCurrentCycle(clamped);
        setCycleInput(String(clamped));
      } else {
        setCycleInput(String(currentCycle));
      }
      e.target.blur();
    }
  };

  const handleCycleBlur = () => {
    setIsInputFocused(false);
    const val = parseInt(cycleInput, 10);
    if (!isNaN(val) && meta) {
      const clamped = Math.max(meta.timeline.startCycle, Math.min(meta.timeline.endCycle, val));
      setCurrentCycle(clamped);
      setCycleInput(String(clamped));
    } else {
      setCycleInput(String(currentCycle));
    }
  };

  // Get active events for current cycle directly from cache without state mutation
  const currentEvents = useMemo(() => {
    const page = Math.floor(currentCycle / PAGE_SIZE);
    const pageData = cycleCacheRef.current.get(page);
    return pageData?.[currentCycle] || pageData?.[String(currentCycle)] || { links: [], router_in: [], vc_occ: [], gen: [] };
  }, [currentCycle, dataVersion]);

  // Calculate layout dimension bounds
  const k = meta?.topology?.k || 4;
  const routerCount = meta?.topology?.routers || k * k;

  const canvasWidth = 800;
  const canvasHeight = 500;
  const routerSize = 50;

  // Build list of routers with layout positions
  const routers = useMemo(() => {
    const list = [];
    for (let r = 0; r < routerCount; r++) {
      const coords = getRouterCoords(r, k, canvasWidth, canvasHeight);
      list.push({ id: r, ...coords });
    }
    return list;
  }, [routerCount, k]);

  // Build grid links (horizontal & vertical)
  const links = useMemo(() => {
    const list = [];
    if (k <= 0) return list;

    for (let r = 0; r < routerCount; r++) {
      const x = r % k;
      const y = Math.floor(r / k);

      // East link (port 0)
      if (x < k - 1) {
        const r2 = r + 1;
        const c1 = getRouterCoords(r, k, canvasWidth, canvasHeight);
        const c2 = getRouterCoords(r2, k, canvasWidth, canvasHeight);
        list.push({ id: `link-h-${r}`, from: r, to: r2, x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, type: 'h' });
      }

      // South link (port 1)
      if (y < k - 1) {
        const r2 = r + k;
        const c1 = getRouterCoords(r, k, canvasWidth, canvasHeight);
        const c2 = getRouterCoords(r2, k, canvasWidth, canvasHeight);
        list.push({ id: `link-v-${r}`, from: r, to: r2, x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, type: 'v' });
      }
    }
    return list;
  }, [routerCount, k]);

  // Calculate current flits position on SVG canvas
  const flitsOnCanvas = useMemo(() => {
    const list = [];
    if (!currentEvents.links) return list;

    currentEvents.links.forEach((linkEvt, i) => {
      let x, y;
      if (linkEvt.type === 'inject') {
        // From node to router
        const routerCoords = getRouterCoords(linkEvt.node, k, canvasWidth, canvasHeight);
        x = routerCoords.x - 30; // offset left for injection
        y = routerCoords.y;
      } else if (linkEvt.type === 'router' && linkEvt.from >= 0 && linkEvt.to >= 0) {
        const c1 = getRouterCoords(linkEvt.from, k, canvasWidth, canvasHeight);
        const c2 = getRouterCoords(linkEvt.to, k, canvasWidth, canvasHeight);
        // Interpolate along line (midpoint = 0.5)
        const progress = linkEvt.head ? 0.6 : 0.4;
        x = c1.x + (c2.x - c1.x) * progress;
        y = c1.y + (c2.y - c1.y) * progress;
      } else {
        return;
      }

      list.push({
        key: `flit-${linkEvt.flit}-${i}`,
        ...linkEvt,
        cx: x,
        cy: y,
      });
    });

    return list;
  }, [currentEvents.links, k]);

  // Calculate full route path for selected flit (from generator router to destination router)
  const highlightedPath = useMemo(() => {
    if (!selectedFlit || selectedFlit.src === undefined || selectedFlit.dest === undefined) {
      return null;
    }

    const src = selectedFlit.src;
    const dest = selectedFlit.dest;

    if (k <= 0) return null;

    const srcX = src % k;
    const srcY = Math.floor(src / k);
    const destX = dest % k;
    const destY = Math.floor(dest / k);

    const routerPath = [];

    // Step along X dimension (DOR routing)
    const stepX = srcX <= destX ? 1 : -1;
    for (let x = srcX; x !== destX + stepX; x += stepX) {
      routerPath.push(srcY * k + x);
    }

    // Step along Y dimension (DOR routing)
    const stepY = srcY <= destY ? 1 : -1;
    for (let y = srcY + stepY; y !== destY + stepY; y += stepY) {
      routerPath.push(y * k + destX);
    }

    // Build link segments between consecutive routers along path
    const pathSegments = [];
    for (let i = 0; i < routerPath.length - 1; i++) {
      const r1 = routerPath[i];
      const r2 = routerPath[i + 1];
      const c1 = getRouterCoords(r1, k, canvasWidth, canvasHeight);
      const c2 = getRouterCoords(r2, k, canvasWidth, canvasHeight);
      pathSegments.push({ from: r1, to: r2, x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y });
    }

    return {
      srcRouter: src,
      destRouter: dest,
      routerPath,
      pathSegments,
      hopCount: pathSegments.length
    };
  }, [selectedFlit, k, canvasWidth, canvasHeight]);

  // Activity Map minimap buckets (downsample to ~100 bars)
  const minimapBars = useMemo(() => {
    if (!meta?.activityMap || meta.activityMap.length === 0) return [];

    const activity = meta.activityMap;
    const barCount = 100;
    const chunkSize = Math.max(1, Math.ceil(activity.length / barCount));
    const maxVal = Math.max(...activity, 1);

    const bars = [];
    for (let i = 0; i < activity.length; i += chunkSize) {
      const chunk = activity.slice(i, i + chunkSize);
      const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
      const heightPct = Math.min(100, Math.max(8, (avg / maxVal) * 100));
      bars.push({
        startCycle: meta.timeline.startCycle + i,
        endCycle: meta.timeline.startCycle + i + chunk.length - 1,
        heightPct,
        val: avg
      });
    }
    return bars;
  }, [meta]);

  if (loading) {
    return (
      <div className="net-viz-loading">
        <div className="net-viz-spinner" />
        <div>Parsing VCD trace file metadata...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="net-viz-error">
        <Info size={32} />
        <div>Error loading VCD trace: {error}</div>
      </div>
    );
  }

  return (
    <div className="net-viz">
      {/* Topology Canvas */}
      <div className="net-viz-canvas" ref={canvasRef}>
        {/* Info overlay badge */}
        <div className="net-viz-info-badge">
          <span>
            Topology: <strong className="badge-accent">{k}×{k} Mesh</strong> ({routerCount} Routers)
          </span>
          <span>
            Active Flits: <strong className="badge-accent">{currentEvents.links?.length || 0}</strong>
          </span>
          <span>
            VC Occupancies: <strong className="badge-accent">{currentEvents.vc_occ?.length || 0}</strong>
          </span>
        </div>

        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={() => setSelectedFlit(null)}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links */}
          {links.map(link => (
            <line
              key={link.id}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              className="mesh-link"
            />
          ))}

          {/* Highlighted Flit Path Overlay */}
          {highlightedPath && (
            <g className="highlighted-path-group">
              {highlightedPath.pathSegments.map((seg, idx) => (
                <line
                  key={`path-glow-${idx}`}
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  className="path-line-glow"
                />
              ))}
              {highlightedPath.pathSegments.map((seg, idx) => (
                <line
                  key={`path-line-${idx}`}
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  className="path-line-flow"
                />
              ))}
            </g>
          )}

          {/* Routers */}
          {routers.map(r => {
            const isHovered = hoveredRouter === r.id;
            const isSelected = selectedRouter === r.id;
            const isPathSrc = highlightedPath?.srcRouter === r.id;
            const isPathDest = highlightedPath?.destRouter === r.id;
            const isInPath = highlightedPath?.routerPath.includes(r.id);

            // Compute VC occupancy sum for this router
            const occEvents = currentEvents.vc_occ?.filter(v => v.router === r.id) || [];
            const totalOcc = occEvents.reduce((acc, curr) => acc + curr.occ, 0);

            let rectFill = isSelected ? '#1e1b4b' : isHovered ? '#1e293b' : '#0f172a';
            let rectStroke = isSelected ? '#818cf8' : totalOcc > 0 ? '#6366f1' : 'rgba(255, 255, 255, 0.15)';

            if (isPathSrc) {
              rectFill = 'rgba(34, 197, 94, 0.25)';
              rectStroke = '#22c55e';
            } else if (isPathDest) {
              rectFill = 'rgba(168, 85, 247, 0.25)';
              rectStroke = '#c084fc';
            } else if (isInPath) {
              rectFill = 'rgba(245, 158, 11, 0.15)';
              rectStroke = '#f59e0b';
            }

            return (
              <g
                key={`router-${r.id}`}
                className="router-node"
                transform={`translate(${r.x}, ${r.y})`}
                onMouseEnter={(e) => {
                  setHoveredRouter(r.id);
                  updateTooltipPos(e);
                }}
                onMouseMove={updateTooltipPos}
                onMouseLeave={() => setHoveredRouter(null)}
                onClick={() => setSelectedRouter(r.id === selectedRouter ? null : r.id)}
              >
                {/* Outer shadow/highlight rect */}
                <rect
                  x={-routerSize / 2}
                  y={-routerSize / 2}
                  width={routerSize}
                  height={routerSize}
                  className="router-rect"
                  fill={rectFill}
                  stroke={rectStroke}
                />

                {/* Router Label */}
                <text className="router-label" y={totalOcc > 0 ? -6 : 0}>
                  R{r.id}
                </text>

                {isPathSrc && (
                  <text className="router-badge-src" y={totalOcc > 0 ? 16 : 14}>
                    SRC
                  </text>
                )}
                {isPathDest && !isPathSrc && (
                  <text className="router-badge-dest" y={totalOcc > 0 ? 16 : 14}>
                    DEST
                  </text>
                )}

                {/* Micro VC Occupancy Indicator Bar inside router */}
                {totalOcc > 0 && (
                  <g transform={`translate(${-routerSize / 2 + 8}, 8)`}>
                    <rect className="vc-bar-bg" width={routerSize - 16} height={5} />
                    <rect
                      className="vc-bar-fill"
                      width={Math.min(routerSize - 16, totalOcc * 4)}
                      height={5}
                      fill={isPathSrc ? '#4ade80' : isPathDest ? '#c084fc' : isInPath ? '#f59e0b' : '#818cf8'}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Flit Dots moving on canvas */}
          {flitsOnCanvas.map(flit => {
            const isFlitSelected = selectedFlit?.flit === flit.flit && selectedFlit?.pkt === flit.pkt;
            const flitColor = getFlitColor(flit);

            return (
              <g key={flit.key}>
                {isFlitSelected && (
                  <circle
                    cx={flit.cx}
                    cy={flit.cy}
                    r={14}
                    className="flit-selected-ring"
                  />
                )}
                <circle
                  cx={flit.cx}
                  cy={flit.cy}
                  r={flit.head ? 6 : 4}
                  fill={isFlitSelected ? '#f59e0b' : flitColor}
                  className={`flit-dot ${flit.head ? 'flit-dot-head' : ''} ${flit.tail ? 'flit-dot-tail' : ''} ${isFlitSelected ? 'flit-dot-selected' : ''}`}
                  onMouseEnter={(e) => {
                    setHoveredFlit(flit);
                    updateTooltipPos(e);
                  }}
                  onMouseMove={updateTooltipPos}
                  onMouseLeave={() => setHoveredFlit(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFlit(isFlitSelected ? null : flit);
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredFlit && (
          <div
            className="net-viz-tooltip"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="tooltip-label">Flit Info</div>
            <div className="tooltip-value">Flit ID: #{hoveredFlit.flit}</div>
            <div className="tooltip-value">Packet ID: #{hoveredFlit.pkt}</div>
            <div className="tooltip-value">Source: Node {hoveredFlit.src}</div>
            <div className="tooltip-value">Dest: Node {hoveredFlit.dest}</div>
            <div className="tooltip-value">VC: {hoveredFlit.vc}</div>
            <div className="tooltip-value">Type: {hoveredFlit.head ? 'HEAD' : hoveredFlit.tail ? 'TAIL' : 'BODY'}</div>
          </div>
        )}

        {hoveredRouter !== null && !hoveredFlit && (
          <div
            className="net-viz-tooltip"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="tooltip-label">Router R{hoveredRouter}</div>
            <div className="tooltip-value">Occupancy: {
              (currentEvents.vc_occ?.filter(v => v.router === hoveredRouter) || [])
                .reduce((acc, curr) => acc + curr.occ, 0)
            } flits in buffers</div>
          </div>
        )}

        {/* Floating Legend */}
        <div className="net-viz-legend">
          <div className="legend-item">
            <span className="legend-dot legend-dot-head" style={{ background: FLIT_COLORS.head }} /> Head Flit
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: FLIT_COLORS.body }} /> Body Flit
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: FLIT_COLORS.tail }} /> Tail Flit
          </div>
        </div>
      </div>

      {/* Timeline & Controls Panel */}
      <div className="net-viz-timeline">
        {/* Activity Minimap */}
        <div className="activity-minimap" title="Cycle activity heatmap — click to jump">
          {minimapBars.map((bar, idx) => {
            const isCurrent = currentCycle >= bar.startCycle && currentCycle <= bar.endCycle;
            return (
              <div
                key={`bar-${idx}`}
                className={`activity-bar ${isCurrent ? 'current' : ''}`}
                style={{ height: `${bar.heightPct}%` }}
                onClick={() => setCurrentCycle(bar.startCycle)}
              />
            );
          })}
        </div>

        {/* Timeline Bar Scrubber */}
        <div className="timeline-bar-container">
          <div
            className="timeline-bar"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              if (meta) {
                const cycle = Math.round(meta.timeline.startCycle + pct * (meta.timeline.endCycle - meta.timeline.startCycle));
                setCurrentCycle(cycle);
              }
            }}
          >
            <div
              className="timeline-progress"
              style={{
                width: `${meta ? ((currentCycle - meta.timeline.startCycle) / Math.max(1, meta.timeline.endCycle - meta.timeline.startCycle)) * 100 : 0}%`
              }}
            />
            <div
              className="timeline-thumb"
              style={{
                left: `${meta ? ((currentCycle - meta.timeline.startCycle) / Math.max(1, meta.timeline.endCycle - meta.timeline.startCycle)) * 100 : 0}%`
              }}
            />
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="timeline-controls">
          <button
            className="timeline-btn"
            title="Reset to Start"
            onClick={() => setCurrentCycle(meta?.timeline?.startCycle || 0)}
          >
            <RotateCcw size={14} />
          </button>
          
          <button
            className="timeline-btn"
            title="Step Back 1 Cycle"
            onClick={() => setCurrentCycle(prev => Math.max(meta?.timeline?.startCycle || 0, prev - 1))}
          >
            <SkipBack size={14} />
          </button>

          <button
            className={`timeline-btn ${isPlaying ? 'active' : ''}`}
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setIsPlaying(p => !p)}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            className="timeline-btn"
            title="Step Forward 1 Cycle"
            onClick={() => setCurrentCycle(prev => Math.min(meta?.timeline?.endCycle || 0, prev + 1))}
          >
            <SkipForward size={14} />
          </button>

          {/* Speed Selector */}
          <div className="speed-selector">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Cycle Counter & Jump Input */}
          <div className="cycle-display">
            <span>Cycle:</span>
            <input
              type="text"
              className="cycle-input"
              value={cycleInput}
              onChange={(e) => setCycleInput(e.target.value)}
              onKeyDown={handleCycleSubmit}
              onFocus={() => setIsInputFocused(true)}
              onBlur={handleCycleBlur}
            />
            <span className="cycle-total">/ {meta?.timeline?.endCycle || 0}</span>
            {fetchingRange && <span className="cycle-events">Loading data...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkVisualizer;
