import { useState, useCallback, useRef } from 'react';

/**
 * useGraphEditor — Core state management for the anynet network editor.
 * Manages nodes, edges, selection, tools, and undo/redo history.
 */
export const useGraphEditor = (initialNodes = [], initialEdges = []) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTool, setActiveTool] = useState('select'); // 'select'|'addRouter'|'addNode'|'addLink'|'delete'
  const [linkStart, setLinkStart] = useState(null); // node id when drawing a link

  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const nextId = useRef(1000); // start high to avoid collisions with imported IDs

  // --- Snapshot for undo ---
  const pushUndo = useCallback(() => {
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    redoStack.current = []; // clear redo on new action
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const current = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    redoStack.current.push(current);
    const prev = undoStack.current.pop();
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setSelectedIds(new Set());
  }, [nodes, edges]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const current = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    undoStack.current.push(current);
    const next = redoStack.current.pop();
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedIds(new Set());
  }, [nodes, edges]);

  // --- Generate unique ID ---
  const genId = useCallback((prefix) => {
    const id = `${prefix}-${nextId.current++}`;
    return id;
  }, []);

  // --- Node operations ---
  const addRouter = useCallback((x, y) => {
    pushUndo();
    const id = genId('router');
    const routerCount = nodes.filter(n => n.type === 'router').length;
    const newNode = { id, x, y, type: 'router', label: `R${routerCount}` };
    setNodes(prev => [...prev, newNode]);
    setSelectedIds(new Set([id]));
    return newNode;
  }, [pushUndo, genId, nodes]);

  const addNode = useCallback((x, y) => {
    pushUndo();
    const id = genId('node');
    const nodeCount = nodes.filter(n => n.type === 'node').length;
    const newNode = { id, x, y, type: 'node', label: `N${nodeCount}` };
    setNodes(prev => [...prev, newNode]);
    setSelectedIds(new Set([id]));
    return newNode;
  }, [pushUndo, genId, nodes]);

  const moveNode = useCallback((id, x, y) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  // --- Edge operations ---
  const addEdge = useCallback((sourceId, targetId, latency = 1) => {
    const src = nodes.find(n => n.id === sourceId);
    const tgt = nodes.find(n => n.id === targetId);
    if (!src || !tgt) return null;

    // Prevent node↔node
    if (src.type === 'node' && tgt.type === 'node') return null;

    // Prevent duplicate edges
    const exists = edges.some(e =>
      (e.source === sourceId && e.target === targetId) ||
      (e.source === targetId && e.target === sourceId)
    );
    if (exists) return null;

    // Prevent self-loops
    if (sourceId === targetId) return null;

    // If target is a node, check it's not already connected to another router
    if (tgt.type === 'node') {
      const existingRouterConn = edges.find(e => {
        const otherId = e.source === tgt.id ? e.target : (e.target === tgt.id ? e.source : null);
        if (!otherId) return false;
        const other = nodes.find(n => n.id === otherId);
        return other && other.type === 'router';
      });
      if (existingRouterConn) return null; // already connected to a router
    }
    if (src.type === 'node') {
      const existingRouterConn = edges.find(e => {
        const otherId = e.source === src.id ? e.target : (e.target === src.id ? e.source : null);
        if (!otherId) return false;
        const other = nodes.find(n => n.id === otherId);
        return other && other.type === 'router';
      });
      if (existingRouterConn) return null;
    }

    pushUndo();
    const id = genId('edge');
    const newEdge = { id, source: sourceId, target: targetId, latency };
    setEdges(prev => [...prev, newEdge]);
    return newEdge;
  }, [nodes, edges, pushUndo, genId]);

  const updateEdgeLatency = useCallback((edgeId, latency) => {
    pushUndo();
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, latency } : e));
  }, [pushUndo]);

  // --- Delete ---
  const removeElement = useCallback((id) => {
    pushUndo();
    // If it's a node, also remove its edges
    const node = nodes.find(n => n.id === id);
    if (node) {
      setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
      setNodes(prev => prev.filter(n => n.id !== id));
    } else {
      // It's an edge
      setEdges(prev => prev.filter(e => e.id !== id));
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [pushUndo, nodes]);

  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushUndo();
    const idsToRemove = new Set(selectedIds);

    // For each selected node, also mark its edges for removal
    const nodesToRemove = nodes.filter(n => idsToRemove.has(n.id));
    const edgesFromNodes = new Set();
    nodesToRemove.forEach(node => {
      edges.forEach(e => {
        if (e.source === node.id || e.target === node.id) {
          edgesFromNodes.add(e.id);
        }
      });
    });

    setEdges(prev => prev.filter(e => !idsToRemove.has(e.id) && !edgesFromNodes.has(e.id)));
    setNodes(prev => prev.filter(n => !idsToRemove.has(n.id)));
    setSelectedIds(new Set());
  }, [selectedIds, pushUndo, nodes, edges]);

  // --- Selection ---
  const selectElement = useCallback((id, additive = false) => {
    if (additive) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // --- Link drawing ---
  const startLink = useCallback((nodeId) => {
    setLinkStart(nodeId);
  }, []);

  const completeLink = useCallback((targetId) => {
    if (linkStart && linkStart !== targetId) {
      addEdge(linkStart, targetId);
    }
    setLinkStart(null);
  }, [linkStart, addEdge]);

  const cancelLink = useCallback(() => {
    setLinkStart(null);
  }, []);

  // --- Initialize from mesh ---
  const initFromMesh = useCallback((k, n, canvasWidth, canvasHeight) => {
    const safeK = Math.max(1, Math.min(k, 16));
    const newNodes = [];
    const newEdges = [];
    let idCounter = 0;

    const padding = 60;
    const availW = canvasWidth - padding * 2;
    const availH = canvasHeight - padding * 2;
    const spacingX = safeK > 1 ? availW / (safeK - 1) : 0;
    const spacingY = safeK > 1 ? availH / (safeK - 1) : 0;
    const spacing = Math.min(spacingX, spacingY);
    const gridW = (safeK - 1) * spacing;
    const gridH = (safeK - 1) * spacing;
    const offsetX = (canvasWidth - gridW) / 2;
    const offsetY = (canvasHeight - gridH) / 2;

    // Create routers in a 2D grid
    const routerGrid = [];
    for (let row = 0; row < safeK; row++) {
      for (let col = 0; col < safeK; col++) {
        const rid = `router-${idCounter}`;
        const routerIdx = row * safeK + col;
        newNodes.push({
          id: rid,
          x: offsetX + col * spacing,
          y: offsetY + row * spacing,
          type: 'router',
          label: `R${routerIdx}`,
        });
        routerGrid.push(rid);
        idCounter++;
      }
    }

    // Create edges (mesh connections)
    let edgeCounter = 0;
    for (let row = 0; row < safeK; row++) {
      for (let col = 0; col < safeK; col++) {
        const idx = row * safeK + col;
        // Right neighbor
        if (col < safeK - 1) {
          newEdges.push({
            id: `edge-${edgeCounter++}`,
            source: routerGrid[idx],
            target: routerGrid[idx + 1],
            latency: 1,
          });
        }
        // Bottom neighbor
        if (row < safeK - 1) {
          newEdges.push({
            id: `edge-${edgeCounter++}`,
            source: routerGrid[idx],
            target: routerGrid[idx + safeK],
            latency: 1,
          });
        }
      }
    }

    // Add one processing node per router, offset slightly below-right
    for (let i = 0; i < routerGrid.length; i++) {
      const router = newNodes.find(n => n.id === routerGrid[i]);
      const nid = `node-${i}`;
      newNodes.push({
        id: nid,
        x: router.x + 25,
        y: router.y + 25,
        type: 'node',
        label: `N${i}`,
      });
      newEdges.push({
        id: `edge-${edgeCounter++}`,
        source: routerGrid[i],
        target: nid,
        latency: 1,
      });
    }

    nextId.current = idCounter + 1000;
    undoStack.current = [];
    redoStack.current = [];
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedIds(new Set());
    setActiveTool('select');
    setLinkStart(null);
  }, []);

  // --- Reset ---
  const resetGraph = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setNodes([]);
    setEdges([]);
    setSelectedIds(new Set());
    setActiveTool('select');
    setLinkStart(null);
  }, []);

  return {
    // State
    nodes,
    edges,
    selectedIds,
    activeTool,
    linkStart,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,

    // Actions
    addRouter,
    addNode,
    moveNode,
    addEdge,
    updateEdgeLatency,
    removeElement,
    removeSelected,
    selectElement,
    clearSelection,
    setActiveTool,
    startLink,
    completeLink,
    cancelLink,
    undo,
    redo,
    initFromMesh,
    resetGraph,
    setNodes,
    setEdges,
  };
};
