import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Info } from 'lucide-react';
import { RouterDetailsCard } from './RouterDetailsCard';
import './NetworkVisualizer.css';

const FLIT_COLORS = {
  head: '#10b981',  // emerald
  body: '#94a3b8',  // slate
  tail: '#f59e0b',  // amber
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

export const NetworkVisualizer = ({ filePath, leftCollapsed, onToggleLeftSidebar }) => {
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
  const flitTrackerRef = useRef(new Map());
  const lastCycleRef = useRef(null);
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
      // Clear backend memory cache when component unmounts (file closed)
      fetch(`/api/vcd/cache?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' }).catch(() => {});
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
      const fetchPromises = missingPages.map(async (p) => {
        const start = p * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        const res = await fetch(`/api/vcd/cycles?path=${encodeURIComponent(filePath)}&start=${start}&end=${end}`);
        const data = await res.json();
        if (data.cycles) {
          cycleCacheRef.current.set(p, data.cycles);
          // Trigger a re-render immediately as soon as ANY page finishes loading
          setDataVersion(v => v + 1);
        }
      });

      await Promise.all(fetchPromises);
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
      const intervalMs = Math.max(100, 1000 / speed); // 1x = 1s, 2x = 0.5s, 5x = 0.2s, 10x = 0.1s
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
  const maxRouterOcc = (meta?.topology?.ports || 5) * (meta?.topology?.vcs || 4) * 8;

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
    if (!currentEvents.links) return [];

    const currentLinksMap = new Map();

    currentEvents.links.forEach((linkEvt) => {
      let x = 0;
      let y = 0;
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

      const flitKey = `flit-${linkEvt.pkt}-${linkEvt.flit}`;
      currentLinksMap.set(flitKey, {
        key: flitKey,
        ...linkEvt,
        cx: x,
        cy: y,
        opacity: 1,
        destNode: linkEvt.type === 'router' ? linkEvt.to : linkEvt.node,
        bufferedCycles: 0
      });
    });

    // If timeline is playing/scrubbing sequentially, retain old flits so they glide into routers
    const isSequential = lastCycleRef.current !== null && Math.abs(currentCycle - lastCycleRef.current) === 1;
    
    if (isSequential) {
      for (const [key, oldFlit] of flitTrackerRef.current.entries()) {
        if (!currentLinksMap.has(key)) {
          // If the flit reached its final destination router, it has ejected from the network. Do not buffer its ghost!
          if (oldFlit.destNode === oldFlit.dest) {
            continue;
          }

          const bufferedCycles = (oldFlit.bufferedCycles || 0) + 1;
          // Keep it in the router buffer for up to 30 cycles before garbage collecting
          if (oldFlit.destNode !== null && bufferedCycles < 30) {
            const destCoords = getRouterCoords(oldFlit.destNode, k, canvasWidth, canvasHeight);
            currentLinksMap.set(key, {
              ...oldFlit,
              cx: destCoords.x,
              cy: destCoords.y,
              opacity: 0.3, // Dim it to show it's buffered
              bufferedCycles
            });
          }
        }
      }
    }

    flitTrackerRef.current = currentLinksMap;
    lastCycleRef.current = currentCycle;

    return Array.from(currentLinksMap.values());
  }, [currentEvents.links, k, currentCycle]);

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

  // Activity curve data points for smooth seekbar
  const activityCurveData = useMemo(() => {
    if (!meta?.activityMap || meta.activityMap.length === 0) return { points: [], maxVal: 1 };

    const activity = meta.activityMap;
    const pointCount = 200; // number of sample points for the curve
    const chunkSize = Math.max(1, Math.ceil(activity.length / pointCount));
    const maxVal = Math.max(...activity, 1);

    const points = [];
    for (let i = 0; i < activity.length; i += chunkSize) {
      const chunk = activity.slice(i, i + chunkSize);
      const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
      const normalizedVal = avg / maxVal;
      const cycle = meta.timeline.startCycle + i + Math.floor(chunk.length / 2);
      points.push({ cycle, val: normalizedVal, rawVal: avg });
    }
    return { points, maxVal };
  }, [meta]);

  // Seekbar hover/drag state
  const seekbarRef = useRef(null);
  const [seekbarWidth, setSeekbarWidth] = useState(800);
  const [seekHoverX, setSeekHoverX] = useState(null);
  const [seekHoverCycle, setSeekHoverCycle] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // Track seekbar container width with ResizeObserver
  useEffect(() => {
    if (!seekbarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSeekbarWidth(entry.contentRect.width);
      }
    });
    observer.observe(seekbarRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const getCycleFromSeekbarX = useCallback((clientX) => {
    if (!seekbarRef.current || !meta) return null;
    const rect = seekbarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(meta.timeline.startCycle + pct * (meta.timeline.endCycle - meta.timeline.startCycle));
  }, [meta]);

  const handleSeekbarMouseMove = useCallback((e) => {
    if (!seekbarRef.current) return;
    const rect = seekbarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setSeekHoverX(x);
    setSeekHoverCycle(getCycleFromSeekbarX(e.clientX));
    if (isSeeking) {
      const cycle = getCycleFromSeekbarX(e.clientX);
      if (cycle !== null) setCurrentCycle(cycle);
    }
  }, [getCycleFromSeekbarX, isSeeking]);

  const handleSeekbarMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsSeeking(true);
    const cycle = getCycleFromSeekbarX(e.clientX);
    if (cycle !== null) setCurrentCycle(cycle);
  }, [getCycleFromSeekbarX]);

  const handleSeekbarMouseUp = useCallback(() => {
    setIsSeeking(false);
  }, []);

  const handleSeekbarMouseLeave = useCallback(() => {
    if (!isSeeking) {
      setSeekHoverX(null);
      setSeekHoverCycle(null);
    }
  }, [isSeeking]);

  // Global mouseup/mousemove for drag-seeking outside the seekbar
  useEffect(() => {
    if (!isSeeking) return;
    const onMouseMove = (e) => {
      const cycle = getCycleFromSeekbarX(e.clientX);
      if (cycle !== null) setCurrentCycle(cycle);
      if (seekbarRef.current) {
        const rect = seekbarRef.current.getBoundingClientRect();
        setSeekHoverX(e.clientX - rect.left);
        setSeekHoverCycle(cycle);
      }
    };
    const onMouseUp = () => {
      setIsSeeking(false);
      setSeekHoverX(null);
      setSeekHoverCycle(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isSeeking, getCycleFromSeekbarX]);

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
    <div className="net-viz" style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="net-viz-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topology Canvas */}
        <div className="net-viz-canvas" ref={canvasRef}>
        {/* Info overlay badge */}
        {fetchingRange && (
          <div className="net-viz-fetching-indicator">
            <div className="net-viz-fetching-spinner" />
            <span>Fetching Data...</span>
          </div>
        )}
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
            const busyVCs = occEvents.length;
            const totalVCs = (meta?.topology?.ports || 5) * (meta?.topology?.vcs || 4);

            let rectFill = isSelected ? '#262626' : isHovered ? '#171717' : '#0a0a0a';
            let rectStroke = isSelected ? '#d4d4d4' : totalOcc > 0 ? '#737373' : 'rgba(255, 255, 255, 0.15)';

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

            const fillRatio = Math.min(1, busyVCs / totalVCs);
            const barHue = (1 - fillRatio) * 120;
            const barColor = `hsl(${barHue}, 80%, 50%)`;

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
                onClick={() => {
                  const isSelecting = r.id !== selectedRouter;
                  const wasCardClosed = selectedRouter === null;
                  setSelectedRouter(isSelecting ? r.id : null);
                  if (isSelecting && wasCardClosed && leftCollapsed === false && onToggleLeftSidebar) {
                    onToggleLeftSidebar();
                  }
                }}
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
                {busyVCs > 0 && (
                  <g transform={`translate(${-routerSize / 2 + 8}, 8)`}>
                    <rect className="vc-bar-bg" width={routerSize - 16} height={5} />
                    <rect
                      className="vc-bar-fill"
                      width={Math.max(2, Math.min(routerSize - 16, fillRatio * (routerSize - 16)))}
                      height={5}
                      fill={barColor}
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
                    cx={0}
                    cy={0}
                    r={14}
                    className="flit-selected-ring"
                    style={{ 
                      opacity: flit.opacity, 
                      transform: `translate(${flit.cx}px, ${flit.cy}px)`
                    }}
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r={flit.head ? 6 : 4}
                  fill={isFlitSelected ? '#f59e0b' : flitColor}
                  className={`flit-dot ${flit.head ? 'flit-dot-head' : ''} ${flit.tail ? 'flit-dot-tail' : ''} ${isFlitSelected ? 'flit-dot-selected' : ''}`}
                  style={{ 
                    opacity: flit.opacity, 
                    transform: `translate(${flit.cx}px, ${flit.cy}px)`
                  }}
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
          (() => {
            const routerOccs = currentEvents.vc_occ?.filter(v => v.router === hoveredRouter) || [];
            const totalOcc = routerOccs.reduce((acc, curr) => acc + curr.occ, 0);
            
            // Group by port
            const portOccs = {};
            routerOccs.forEach(v => {
              if (!portOccs[v.port]) portOccs[v.port] = 0;
              portOccs[v.port] += v.occ;
            });

            return (
              <div
                className="net-viz-tooltip"
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
              >
                <div className="tooltip-label">Router R{hoveredRouter}</div>
                <div className="tooltip-value" style={{ marginBottom: '4px' }}>
                  Total: {totalOcc} / {maxRouterOcc} flits
                </div>
                {Object.entries(portOccs).map(([port, occ]) => (
                  <div key={port} className="tooltip-value" style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    Port {port}: {occ} flits
                  </div>
                ))}
                {totalOcc === 0 && (
                  <div className="tooltip-value" style={{ fontSize: '11px', color: '#94a3b8' }}>
                    All buffers empty
                  </div>
                )}
              </div>
            );
          })()
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
        {/* Smooth Seekbar with Activity Curve */}
        <div
          className={`seekbar-container ${isSeeking ? 'seeking' : ''} ${seekHoverX !== null ? 'hovered' : ''}`}
          ref={seekbarRef}
          onMouseMove={handleSeekbarMouseMove}
          onMouseDown={handleSeekbarMouseDown}
          onMouseUp={handleSeekbarMouseUp}
          onMouseLeave={handleSeekbarMouseLeave}
        >
          {(() => {
            const svgW = seekbarWidth;
            const svgH = 52;
            const curveH = 40; // area for the curve
            const curveY0 = 6; // top padding
            const pts = activityCurveData.points;
            const progressPct = meta ? (currentCycle - meta.timeline.startCycle) / Math.max(1, meta.timeline.endCycle - meta.timeline.startCycle) : 0;
            const progressX = progressPct * svgW;

            // Build smooth spline path using monotone cubic interpolation
            let curvePath = '';
            let areaPath = '';
            if (pts.length > 1) {
              const xCoords = pts.map((_, i) => (i / (pts.length - 1)) * svgW);
              const yCoords = pts.map(p => curveY0 + curveH - p.val * (curveH - 4));

              // Monotone cubic Hermite spline (Fritsch-Carlson)
              const n = xCoords.length;
              const dx = [], dy = [], m = [];
              for (let i = 0; i < n - 1; i++) {
                dx.push(xCoords[i+1] - xCoords[i]);
                dy.push(yCoords[i+1] - yCoords[i]);
                m.push(dy[i] / dx[i]);
              }
              const tangents = [m[0]];
              for (let i = 1; i < n - 1; i++) {
                if (m[i-1] * m[i] <= 0) {
                  tangents.push(0);
                } else {
                  tangents.push((m[i-1] + m[i]) / 2);
                }
              }
              tangents.push(m[n - 2]);

              // Build cubic bezier segments
              let pathD = `M ${xCoords[0]},${yCoords[0]}`;
              for (let i = 0; i < n - 1; i++) {
                const seg = dx[i] / 3;
                const cp1x = xCoords[i] + seg;
                const cp1y = yCoords[i] + tangents[i] * seg;
                const cp2x = xCoords[i+1] - seg;
                const cp2y = yCoords[i+1] - tangents[i+1] * seg;
                pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${xCoords[i+1]},${yCoords[i+1]}`;
              }

              curvePath = pathD;
              areaPath = `${pathD} L ${xCoords[n-1]},${curveY0 + curveH} L ${xCoords[0]},${curveY0 + curveH} Z`;
            } else if (pts.length === 1) {
              curvePath = `M 0,${curveY0 + curveH - pts[0].val * (curveH - 4)} L ${svgW},${curveY0 + curveH - pts[0].val * (curveH - 4)}`;
              areaPath = `${curvePath} L ${svgW},${curveY0 + curveH} L 0,${curveY0 + curveH} Z`;
            }

            return (
              <svg
                className="seekbar-svg"
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="none"
                width="100%"
                height={svgH}
              >
                <defs>
                  {/* Gradient for the filled area */}
                  <linearGradient id="seekbar-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3a3a3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#a3a3a3" stopOpacity="0.04" />
                  </linearGradient>
                  {/* Gradient for the played portion */}
                  <linearGradient id="seekbar-played-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.08" />
                  </linearGradient>
                  {/* Clip for played portion */}
                  <clipPath id="seekbar-played-clip">
                    <rect x="0" y="0" width={progressX} height={svgH} />
                  </clipPath>
                </defs>

                {/* Full area fill (unplayed / background) */}
                {areaPath && <path d={areaPath} fill="url(#seekbar-area-grad)" />}

                {/* Played area fill */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#seekbar-played-grad)"
                    clipPath="url(#seekbar-played-clip)"
                  />
                )}

                {/* Curve line (unplayed portion, dimmer) */}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="rgba(163,163,163,0.35)"
                    strokeWidth="1.5"
                  />
                )}

                {/* Curve line (played portion, brighter) */}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    clipPath="url(#seekbar-played-clip)"
                  />
                )}

                {/* Bottom baseline */}
                <line
                  x1="0" y1={curveY0 + curveH}
                  x2={svgW} y2={curveY0 + curveH}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />

                {/* Hover vertical line */}
                {seekHoverX !== null && (
                  <line
                    x1={seekHoverX} y1={0}
                    x2={seekHoverX} y2={svgH}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                    className="seekbar-hover-line"
                  />
                )}

                {/* Current position indicator line */}
                <line
                  x1={progressX} y1={curveY0}
                  x2={progressX} y2={curveY0 + curveH}
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  className="seekbar-position-line"
                />

                {/* Current position dot */}
                <circle
                  cx={progressX}
                  cy={curveY0 + curveH}
                  r="4"
                  fill="#818cf8"
                  stroke="#1e1e2e"
                  strokeWidth="2"
                  className="seekbar-position-dot"
                />
              </svg>
            );
          })()}

          {/* Hover cycle tooltip */}
          {seekHoverX !== null && seekHoverCycle !== null && (
            <div
              className="seekbar-hover-tooltip"
              style={{ left: `${seekHoverX}px` }}
            >
              Cycle {seekHoverCycle}
            </div>
          )}
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

      {/* Router Details Card Sidebar */}
      <div 
        style={{ 
          width: selectedRouter !== null ? '450px' : '0px', 
          flexShrink: 0, 
          height: '100%', 
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ width: '450px', height: '100%' }}>
          {selectedRouter !== null && (
            <RouterDetailsCard 
              routerId={selectedRouter} 
              events={currentEvents} 
              meta={meta} 
              onClose={() => setSelectedRouter(null)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkVisualizer;
