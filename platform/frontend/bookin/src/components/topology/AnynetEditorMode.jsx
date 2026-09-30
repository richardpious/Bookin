import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MousePointer2, CircleDot, Square, Minus, Trash2,
  Undo2, Redo2, Check, X, Info
} from 'lucide-react';
import { useGraphEditor } from '../../hooks/useGraphEditor';
import { graphToAnynet, anynetToGraph, validateGraph } from '../../utils/anynetSerializer';
import { readFileContent } from '../../utils/fileUtils';
import './AnynetEditorMode.css';

/**
 * AnynetEditorMode — Full-screen interactive topology editor.
 * 
 * @param {Object} props
 * @param {number} props.initialK - Initial mesh radix from config
 * @param {number} props.initialN - Initial mesh dimensions from config
 * @param {string|null} props.anynetFilePath - Path to existing .anynet file to load
 * @param {Function} props.onDone - (anynetContent: string) => void
 * @param {Function} props.onCancel - () => void
 * @param {Function} props.onToast - (message, type) => void
 */
const AnynetEditorMode = ({ initialK = 4, initialN = 2, initialTopology = 'mesh', anynetFilePath, onDone, onCancel, onToast }) => {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 800, 
    height: typeof window !== 'undefined' ? window.innerHeight : 600 
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragStarted, setDragStarted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [validationErrors, setValidationErrors] = useState(null);

  const {
    nodes, edges, selectedIds, activeTool, linkStart,
    addRouter, addNode, moveNode, addEdge,
    updateEdgeLatency, removeElement, removeSelected,
    selectElement, clearSelection, setActiveTool,
    startLink, completeLink, cancelLink,
    undo, redo, initFromMesh, canUndo, canRedo,
    setNodes, setEdges,
  } = useGraphEditor();

  // Observe container size
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize: load existing anynet file or create from mesh
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    if (canvasSize.width <= 100 || canvasSize.height <= 100) return;
    hasInitialized.current = true;

    if (anynetFilePath) {
      // Load existing anynet file and optional layout json
      const layoutFilePath = `${anynetFilePath}.layout.json`;
      Promise.allSettled([
        readFileContent(anynetFilePath),
        readFileContent(layoutFilePath)
      ]).then(([anynetRes, layoutRes]) => {
        let anynetContent = anynetRes.status === 'fulfilled' ? anynetRes.value.content : null;
        let layoutContent = layoutRes.status === 'fulfilled' ? layoutRes.value.content : null;

        if (!anynetContent) {
          initFromMesh(initialK, initialN, canvasSize.width, canvasSize.height, initialTopology);
          return;
        }

        const { nodes: autoNodes, edges: autoEdges } = anynetToGraph(
          anynetContent, canvasSize.width, canvasSize.height
        );

        if (layoutContent) {
          try {
            const parsedLayout = JSON.parse(layoutContent);
            if (parsedLayout && Array.isArray(parsedLayout.nodes) && parsedLayout.nodes.length > 0) {
              setNodes(parsedLayout.nodes);
              setEdges(parsedLayout.edges && parsedLayout.edges.length > 0 ? parsedLayout.edges : autoEdges);
              return;
            }
          } catch (e) {
            console.warn('Could not parse layout json, using auto graph', e);
          }
        }

        setNodes(autoNodes);
        setEdges(autoEdges);
      }).catch(err => {
        console.error('Failed to load anynet file, falling back to mesh/torus', err);
        initFromMesh(initialK, initialN, canvasSize.width, canvasSize.height, initialTopology);
      });
    } else {
      initFromMesh(initialK, initialN, canvasSize.width, canvasSize.height, initialTopology);
    }
  }, [canvasSize, anynetFilePath, initialK, initialN, initialTopology, initFromMesh, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        removeSelected();
      }
      if (e.key === 'Escape') {
        if (linkStart) {
          cancelLink();
        } else {
          clearSelection();
        }
        setActiveTool('select');
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, removeSelected, linkStart, cancelLink, clearSelection, setActiveTool, undo, redo]);

  // Node lookup
  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  // Hovered node edges
  const hoveredNodeEdges = useMemo(() => {
    if (hoveredNode === null) return new Set();
    const set = new Set();
    edges.forEach((e, i) => {
      if (e.source === hoveredNode || e.target === hoveredNode) set.add(i);
    });
    return set;
  }, [hoveredNode, edges]);

  // Screen to SVG coords
  const screenToSVG = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // --- Canvas interactions ---
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.classList.contains('canvas-bg')) {
      if (activeTool === 'select' || activeTool === 'delete') {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      } else if (activeTool === 'addRouter') {
        const pos = screenToSVG(e.clientX, e.clientY);
        addRouter(pos.x, pos.y);
      } else if (activeTool === 'addNode') {
        const pos = screenToSVG(e.clientX, e.clientY);
        addNode(pos.x, pos.y);
      } else if (activeTool === 'addLink') {
        if (linkStart) {
          cancelLink();
        }
      }
      if (activeTool !== 'addRouter' && activeTool !== 'addNode') {
        clearSelection();
      }
    }
  }, [activeTool, pan, screenToSVG, addRouter, addNode, linkStart, cancelLink, clearSelection]);

  const handleCanvasMouseMove = useCallback((e) => {
    // Track mouse for rubber band
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (draggingNode) {
      setDragStarted(true);
      const pos = screenToSVG(e.clientX, e.clientY);
      moveNode(draggingNode, pos.x, pos.y);
    }
  }, [isPanning, panStart, draggingNode, moveNode, screenToSVG, pan, zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggingNode && !dragStarted) {
      // It was a click, not a drag
    }
    setDraggingNode(null);
    setDragStarted(false);
  }, [draggingNode, dragStarted]);

  // --- Zoom ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleBy = 1.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = direction > 0
      ? Math.min(zoom * scaleBy, 4)
      : Math.max(zoom / scaleBy, 0.15);

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPan(p => ({
      x: mouseX - (mouseX - p.x) * (newZoom / zoom),
      y: mouseY - (mouseY - p.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // --- Node interactions ---
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();

    if (activeTool === 'delete') {
      removeElement(nodeId);
      return;
    }

    if (activeTool === 'addLink') {
      if (!linkStart) {
        startLink(nodeId);
      } else {
        completeLink(nodeId);
      }
      return;
    }

    // Select or start drag
    selectElement(nodeId, e.shiftKey);
    setDraggingNode(nodeId);
    setDragStarted(false);
  }, [activeTool, linkStart, removeElement, startLink, completeLink, selectElement]);

  const handleEdgeClick = useCallback((e, edgeId) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      removeElement(edgeId);
    } else {
      selectElement(edgeId, e.shiftKey);
    }
  }, [activeTool, removeElement, selectElement]);

  // --- Done ---
  const handleDone = useCallback(() => {
    const result = validateGraph(nodes, edges);
    if (!result.valid) {
      setValidationErrors(result.errors);
      setTimeout(() => setValidationErrors(null), 5000);
      return;
    }
    setValidationErrors(null);
    const content = graphToAnynet(nodes, edges);
    onDone(content, { nodes, edges });
  }, [nodes, edges, onDone]);

  // --- Sizing (make elements significantly bigger for clarity) ---
  const nodeRadius = nodes.length > 100 ? 12 : nodes.length > 36 ? 16 : 22;
  const fontSize = nodes.length > 100 ? 9 : nodes.length > 36 ? 11 : 14;
  const procNodeSize = nodeRadius * 0.9;

  // Get selected element info for properties panel
  const selectedElement = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const id = [...selectedIds][0];
    const node = nodes.find(n => n.id === id);
    if (node) {
      const connections = edges.filter(e => e.source === id || e.target === id);
      return { ...node, elementType: 'node', connections };
    }
    const edge = edges.find(e => e.id === id);
    if (edge) {
      return { ...edge, elementType: 'edge' };
    }
    return null;
  }, [selectedIds, nodes, edges]);

  // Cursor style
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'addRouter' || activeTool === 'addNode') return 'crosshair';
    if (activeTool === 'addLink') return linkStart ? 'crosshair' : 'pointer';
    if (activeTool === 'delete') return 'pointer';
    return 'grab';
  };

  return createPortal(
    <div className="anynet-editor-mode">
      <div className="anynet-editor-canvas-area" ref={canvasRef}>
        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ cursor: getCursor(), display: 'block' }}
        >
          <rect className="canvas-bg" x={0} y={0}
            width={canvasSize.width} height={canvasSize.height} fill="transparent" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((edge, idx) => {
              const src = nodeMap[edge.source];
              const tgt = nodeMap[edge.target];
              if (!src || !tgt) return null;

              const isHighlighted = hoveredNodeEdges.has(idx);
              const isSelected = selectedIds.has(edge.id);

              return (
                <line
                  key={edge.id}
                  className={`topo-edge ${isHighlighted ? 'highlighted' : ''} ${hoveredEdge === idx ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  onClick={(e) => handleEdgeClick(e, edge.id)}
                  onMouseEnter={() => setHoveredEdge(idx)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  style={{ pointerEvents: 'stroke', strokeWidth: isSelected ? 3 : undefined }}
                />
              );
            })}

            {/* Link rubber band */}
            {linkStart && nodeMap[linkStart] && (
              <line
                className="link-rubber-band"
                x1={nodeMap[linkStart].x}
                y1={nodeMap[linkStart].y}
                x2={mousePos.x}
                y2={mousePos.y}
              />
            )}

            {/* Nodes */}
            {nodes.map(node => {
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedIds.has(node.id);

              return (
                <g
                  key={node.id}
                  className={`topo-node-group ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {/* Glow */}
                  {(isHovered || isSelected) && (
                    <circle
                      className="topo-node-glow"
                      cx={node.x} cy={node.y} r={nodeRadius + 6}
                    />
                  )}

                  {/* Shape: circle for routers, rounded rect for nodes */}
                  {node.type === 'router' ? (
                    <circle
                      className="topo-node"
                      cx={node.x} cy={node.y} r={nodeRadius}
                    />
                  ) : (
                    <rect
                      className="topo-node-processing"
                      x={node.x - procNodeSize}
                      y={node.y - procNodeSize}
                      width={procNodeSize * 2}
                      height={procNodeSize * 2}
                      rx={3}
                    />
                  )}

                  {/* Label */}
                  <text
                    className="topo-node-label"
                    x={node.x} y={node.y} dy="0.35em"
                    textAnchor="middle" fontSize={fontSize}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Toolbox */}
        <div className="editor-toolbox">
          <div className="toolbox-section">
            <button
              className={`toolbox-btn ${activeTool === 'select' ? 'active' : ''}`}
              onClick={() => { setActiveTool('select'); cancelLink(); }}
            >
              <span className="toolbox-icon"><MousePointer2 size={16} /></span>
              Select
            </button>
          </div>

          <div className="toolbox-divider" />

          <div className="toolbox-section">
            <button
              className={`toolbox-btn ${activeTool === 'addRouter' ? 'active' : ''}`}
              onClick={() => { setActiveTool('addRouter'); cancelLink(); }}
            >
              <span className="toolbox-icon"><CircleDot size={16} /></span>
              Add Router
            </button>
            <button
              className={`toolbox-btn ${activeTool === 'addNode' ? 'active' : ''}`}
              onClick={() => { setActiveTool('addNode'); cancelLink(); }}
            >
              <span className="toolbox-icon"><Square size={16} /></span>
              Add Node
            </button>
            <button
              className={`toolbox-btn ${activeTool === 'addLink' ? 'active' : ''}`}
              onClick={() => { setActiveTool('addLink'); cancelLink(); }}
            >
              <span className="toolbox-icon"><Minus size={16} /></span>
              Add Link
            </button>
          </div>

          <div className="toolbox-divider" />

          <div className="toolbox-section">
            <button
              className={`toolbox-btn ${activeTool === 'delete' ? 'active' : ''}`}
              onClick={() => { setActiveTool('delete'); cancelLink(); }}
            >
              <span className="toolbox-icon"><Trash2 size={16} /></span>
              Delete
            </button>
          </div>

          <div className="toolbox-divider" />

          <div className="toolbox-section">
            <button className="toolbox-btn" onClick={undo} disabled={!canUndo}>
              <span className="toolbox-icon"><Undo2 size={16} /></span>
              Undo
            </button>
            <button className="toolbox-btn" onClick={redo} disabled={!canRedo}>
              <span className="toolbox-icon"><Redo2 size={16} /></span>
              Redo
            </button>
          </div>
        </div>

        {/* Properties Panel */}
        {selectedElement && (
          <div className="properties-panel">
            <div className="properties-panel-header">
              <span className="properties-panel-title">
                {selectedElement.elementType === 'node'
                  ? (selectedElement.type === 'router' ? 'Router' : 'Node')
                  : 'Link'
                }
              </span>
              <button className="properties-panel-close" onClick={clearSelection}>
                <X size={14} />
              </button>
            </div>

            {selectedElement.elementType === 'node' ? (
              <>
                <div className="props-field">
                  <span className="props-field-label">Label</span>
                  <span className="props-field-value">{selectedElement.label}</span>
                </div>
                <div className="props-field">
                  <span className="props-field-label">Type</span>
                  <span className="props-field-value">{selectedElement.type}</span>
                </div>
                <div className="props-field">
                  <span className="props-field-label">Position</span>
                  <span className="props-field-value">
                    ({Math.round(selectedElement.x)}, {Math.round(selectedElement.y)})
                  </span>
                </div>
                {selectedElement.connections && selectedElement.connections.length > 0 && (
                  <div className="props-field">
                    <span className="props-field-label">Connections</span>
                    <div className="props-connections-list">
                      {selectedElement.connections.map(conn => {
                        const otherId = conn.source === selectedElement.id ? conn.target : conn.source;
                        const other = nodeMap[otherId];
                        return (
                          <div key={conn.id} className="props-connection-item">
                            → {other?.label || otherId} (lat: {conn.latency})
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button className="props-delete-btn" onClick={() => removeElement(selectedElement.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </>
            ) : (
              <>
                <div className="props-field">
                  <span className="props-field-label">From</span>
                  <span className="props-field-value">
                    {nodeMap[selectedElement.source]?.label || selectedElement.source}
                  </span>
                </div>
                <div className="props-field">
                  <span className="props-field-label">To</span>
                  <span className="props-field-value">
                    {nodeMap[selectedElement.target]?.label || selectedElement.target}
                  </span>
                </div>
                <div className="props-field">
                  <span className="props-field-label">Latency (cycles)</span>
                  <input
                    type="number"
                    className="props-field-input"
                    value={selectedElement.latency}
                    min={1}
                    onChange={(e) => updateEdgeLatency(selectedElement.id, parseInt(e.target.value) || 1)}
                  />
                </div>
                <button className="props-delete-btn" onClick={() => removeElement(selectedElement.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors && (
          <div className="editor-validation-errors">
            <div className="editor-validation-errors-title">
              <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
              Cannot export — fix these issues:
            </div>
            <ul>
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="editor-bottom-bar">
          <span className="editor-bar-stats">
            {nodes.filter(n => n.type === 'router').length} routers · {nodes.filter(n => n.type === 'node').length} nodes · {edges.length} links
          </span>
          <div className="editor-bar-divider" />
          <button className="editor-bar-btn cancel" onClick={onCancel}>
            <X size={14} /> Cancel
          </button>
          <button className="editor-bar-btn done" onClick={handleDone}>
            <Check size={14} /> Done
          </button>
        </div>

        {/* Zoom controls */}
        <div className="canvas-controls">
          <button className="canvas-ctrl-btn" onClick={() => {
            const newZoom = Math.min(zoom * 1.2, 4);
            setPan(p => ({
              x: canvasSize.width / 2 - (canvasSize.width / 2 - p.x) * (newZoom / zoom),
              y: canvasSize.height / 2 - (canvasSize.height / 2 - p.y) * (newZoom / zoom),
            }));
            setZoom(newZoom);
          }} title="Zoom in">+</button>
          <button className="canvas-ctrl-btn" onClick={() => {
            const newZoom = Math.max(zoom / 1.2, 0.15);
            setPan(p => ({
              x: canvasSize.width / 2 - (canvasSize.width / 2 - p.x) * (newZoom / zoom),
              y: canvasSize.height / 2 - (canvasSize.height / 2 - p.y) * (newZoom / zoom),
            }));
            setZoom(newZoom);
          }} title="Zoom out">−</button>
          <button className="canvas-ctrl-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view">⌂</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AnynetEditorMode;
