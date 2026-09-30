import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './NetworkTopologyCanvas.css';

/**
 * NetworkTopologyCanvas — A reusable, topology-agnostic SVG canvas.
 *
 * Renders nodes and edges with pan/zoom support.
 * In read-only mode (interactive=false), only hover highlighting is active.
 * In interactive mode (interactive=true), nodes can be dragged and
 * click callbacks are fired — to be used by the future Network Builder.
 *
 * @param {Object} props
 * @param {Array<{id: number|string, x: number, y: number, label?: string}>} props.nodes
 * @param {Array<{source: number|string, target: number|string}>} props.edges
 * @param {boolean} [props.interactive=false]
 * @param {Function} [props.onNodeDrag] - (id, x, y) => void
 * @param {Function} [props.onNodeClick] - (id) => void
 * @param {Function} [props.onEdgeClick] - (source, target) => void
 * @param {number} [props.width=600]
 * @param {number} [props.height=400]
 * @param {string} [props.className]
 */
const NetworkTopologyCanvas = ({
  nodes = [],
  edges = [],
  interactive = false,
  onNodeDrag,
  onNodeClick,
  onEdgeClick,
  width = 600,
  height = 400,
  className = '',
}) => {
  const svgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);

  // Build a quick node lookup map
  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  // Compute the set of edges connected to the hovered node
  const hoveredNodeEdges = useMemo(() => {
    if (hoveredNode === null) return new Set();
    const set = new Set();
    edges.forEach((e, i) => {
      if (e.source === hoveredNode || e.target === hoveredNode) {
        set.add(i);
      }
    });
    return set;
  }, [hoveredNode, edges]);

  // Compute the set of nodes connected to the hovered node (neighbors)
  const neighborNodes = useMemo(() => {
    if (hoveredNode === null) return new Set();
    const set = new Set();
    edges.forEach(e => {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    });
    return set;
  }, [hoveredNode, edges]);

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // --- Pan handlers ---
  const handleMouseDown = useCallback((e) => {
    // Only pan when clicking on the background (not on a node)
    if (e.target === svgRef.current || e.target.classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (interactive && draggingNode !== null && onNodeDrag) {
      const pos = screenToSVG(e.clientX, e.clientY);
      onNodeDrag(draggingNode, pos.x, pos.y);
    }
  }, [isPanning, panStart, interactive, draggingNode, onNodeDrag, screenToSVG]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
  }, []);

  // --- Zoom handler ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleBy = 1.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = direction > 0
      ? Math.min(zoom * scaleBy, 4)
      : Math.max(zoom / scaleBy, 0.2);

    // Zoom towards cursor position
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  // Attach wheel listener with passive: false
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // --- Node interaction ---
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (interactive) {
      setDraggingNode(nodeId);
    }
  }, [interactive]);

  const handleNodeClick = useCallback((nodeId) => {
    if (onNodeClick) onNodeClick(nodeId);
  }, [onNodeClick]);

  // --- Edge interaction ---
  const handleEdgeClick = useCallback((source, target) => {
    if (onEdgeClick) onEdgeClick(source, target);
  }, [onEdgeClick]);

  // --- Auto-center and fit nodes ---
  const autoCenterView = useCallback(() => {
    if (!nodes || nodes.length === 0 || width <= 0 || height <= 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    const graphW = Math.max(maxX - minX, 1);
    const graphH = Math.max(maxY - minY, 1);
    const padding = 60;
    const scaleX = (width - padding * 2) / graphW;
    const scaleY = (height - padding * 2) / graphH;
    const fitZoom = Math.min(Math.min(scaleX, scaleY), 1.2);

    setZoom(fitZoom);
    setPan({
      x: canvasCenterX - graphCenterX * fitZoom,
      y: canvasCenterY - graphCenterY * fitZoom,
    });
  }, [nodes, width, height]);

  useEffect(() => {
    autoCenterView();
  }, [autoCenterView]);

  // --- Reset view ---
  const resetView = useCallback(() => {
    autoCenterView();
  }, [autoCenterView]);

  // Determine node size based on count
  const nodeRadius = nodes.length > 100 ? 8 : nodes.length > 36 ? 10 : 14;
  const fontSize = nodes.length > 100 ? 6 : nodes.length > 36 ? 7 : 9;

  return (
    <div className={`network-topology-canvas ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : (interactive ? 'crosshair' : 'grab') }}
      >
        {/* Background */}
        <rect
          className="canvas-bg"
          x={0} y={0}
          width={width} height={height}
          fill="transparent"
        />

        {/* Transform group for pan/zoom */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge, idx) => {
            const src = nodeMap[edge.source];
            const tgt = nodeMap[edge.target];
            if (!src || !tgt) return null;

            const isHighlighted = hoveredNodeEdges.has(idx);

            return (
              <line
                key={`edge-${edge.source}-${edge.target}`}
                className={`topo-edge ${isHighlighted ? 'highlighted' : ''} ${hoveredEdge === idx ? 'hovered' : ''}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                onClick={() => handleEdgeClick(edge.source, edge.target)}
                onMouseEnter={() => setHoveredEdge(idx)}
                onMouseLeave={() => setHoveredEdge(null)}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNode === node.id;
            const isNeighbor = neighborNodes.has(node.id);

            return (
              <g
                key={`node-${node.id}`}
                className={`topo-node-group ${isHovered ? 'hovered' : ''} ${isNeighbor ? 'neighbor' : ''}`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={() => handleNodeClick(node.id)}
              >
                {/* Glow effect behind the node */}
                {isHovered && (
                  <circle
                    className="topo-node-glow"
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius + 6}
                  />
                )}

                {/* Node circle */}
                <circle
                  className="topo-node"
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius}
                />

                {/* Node label */}
                <text
                  className="topo-node-label"
                  x={node.x}
                  y={node.y}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={fontSize}
                >
                  {node.label !== undefined ? node.label : node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="canvas-controls">
        <button
          className="canvas-ctrl-btn"
          onClick={() => {
            const newZoom = Math.min(zoom * 1.2, 4);
            setPan(p => ({
              x: width / 2 - (width / 2 - p.x) * (newZoom / zoom),
              y: height / 2 - (height / 2 - p.y) * (newZoom / zoom),
            }));
            setZoom(newZoom);
          }}
          title="Zoom in"
        >
          +
        </button>
        <button
          className="canvas-ctrl-btn"
          onClick={() => {
            const newZoom = Math.max(zoom / 1.2, 0.2);
            setPan(p => ({
              x: width / 2 - (width / 2 - p.x) * (newZoom / zoom),
              y: height / 2 - (height / 2 - p.y) * (newZoom / zoom),
            }));
            setZoom(newZoom);
          }}
          title="Zoom out"
        >
          −
        </button>
        <button
          className="canvas-ctrl-btn"
          onClick={resetView}
          title="Reset view"
        >
          ⌂
        </button>
      </div>
    </div>
  );
};

export default NetworkTopologyCanvas;
