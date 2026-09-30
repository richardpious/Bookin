/**
 * anynetSerializer.js
 * 
 * Converts between the visual graph representation (nodes/edges)
 * and BookSim's anynet text file format.
 *
 * Anynet format (from anynet.cpp):
 *   router 0 node 0 node 1 5 router 1 15 router 2
 *   router 1 node 2 router 0 router 3
 *
 * Rules:
 * - Each line starts with "router <id>" or "node <id>"
 * - Followed by body items: "router <id>" or "node <id>" with optional latency
 * - IDs must be sequential ints starting at 0
 * - router↔router links are auto-bidirectional
 * - node↔node is illegal
 * - Each node connects to exactly one router
 */

/**
 * Export graph to anynet file content.
 * 
 * @param {Array<{id: string, x: number, y: number, type: 'router'|'node'}>} nodes
 * @param {Array<{id: string, source: string, target: string, latency: number}>} edges
 * @returns {string} Anynet file content
 */
export function graphToAnynet(nodes, edges) {
  // Separate routers and processing nodes
  const routers = nodes.filter(n => n.type === 'router');
  const procNodes = nodes.filter(n => n.type === 'node');

  // Build re-mapping: internal IDs → sequential IDs starting at 0
  const routerIdMap = {};
  routers.forEach((r, idx) => { routerIdMap[r.id] = idx; });

  const nodeIdMap = {};
  procNodes.forEach((n, idx) => { nodeIdMap[n.id] = idx; });

  // Build adjacency: for each router, collect connected routers and nodes
  const routerAdj = {}; // routerId → [{type, id, latency}]
  routers.forEach(r => { routerAdj[r.id] = []; });

  // Track which router↔router pairs we've already written (to avoid duplicates)
  const writtenRouterPairs = new Set();

  edges.forEach(edge => {
    const src = nodes.find(n => n.id === edge.source);
    const tgt = nodes.find(n => n.id === edge.target);
    if (!src || !tgt) return;

    if (src.type === 'router' && tgt.type === 'node') {
      routerAdj[src.id].push({ type: 'node', id: tgt.id, latency: edge.latency || 1 });
    } else if (src.type === 'node' && tgt.type === 'router') {
      routerAdj[tgt.id].push({ type: 'node', id: src.id, latency: edge.latency || 1 });
    } else if (src.type === 'router' && tgt.type === 'router') {
      routerAdj[src.id].push({ type: 'router', id: tgt.id, latency: edge.latency || 1 });
    }
  });

  // Generate lines
  const lines = [];
  routers.forEach(r => {
    const parts = [`router ${routerIdMap[r.id]}`];
    const adj = routerAdj[r.id];

    // Nodes first, then routers
    const nodeConns = adj.filter(a => a.type === 'node');
    const routerConns = adj.filter(a => a.type === 'router');

    nodeConns.forEach(conn => {
      parts.push(`node ${nodeIdMap[conn.id]}`);
      if (conn.latency && conn.latency !== 1) {
        parts.push(`${conn.latency}`);
      }
    });

    routerConns.forEach(conn => {
      const pairKey = [routerIdMap[r.id], routerIdMap[conn.id]].sort().join('-');
      if (!writtenRouterPairs.has(pairKey)) {
        parts.push(`router ${routerIdMap[conn.id]}`);
        if (conn.latency && conn.latency !== 1) {
          parts.push(`${conn.latency}`);
        }
        writtenRouterPairs.add(pairKey);
      }
    });

    // Only write line if router has connections
    if (parts.length > 1) {
      lines.push(parts.join(' '));
    } else {
      // Still write isolated routers so they appear in the topology
      lines.push(parts.join(' '));
    }
  });

  return lines.join('\n') + '\n';
}

/**
 * Parse anynet file content into graph nodes and edges.
 * Auto-layouts nodes in a circular arrangement.
 *
 * @param {string} text - Anynet file content
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {{ nodes: Array, edges: Array }}
 */
export function anynetToGraph(text, canvasWidth = 600, canvasHeight = 400) {
  const lines = text.split('\n').filter(l => l.trim());
  const routerIds = new Set();
  const nodeIds = new Set();
  const edgeList = [];
  const nodeAttachments = {}; // nodeId → routerId

  lines.forEach(line => {
    const tokens = line.trim().split(/\s+/);
    let i = 0;

    // Parse head
    if (i >= tokens.length) return;
    const headType = tokens[i++];
    if (i >= tokens.length) return;
    const headId = parseInt(tokens[i++]);

    if (headType === 'router') {
      routerIds.add(headId);
    } else if (headType === 'node') {
      nodeIds.add(headId);
    }

    // Parse body items
    while (i < tokens.length) {
      const bodyType = tokens[i];
      if (bodyType !== 'router' && bodyType !== 'node') {
        i++;
        continue;
      }
      i++;
      if (i >= tokens.length) break;
      const bodyId = parseInt(tokens[i++]);

      // Check for optional latency
      let latency = 1;
      if (i < tokens.length && !isNaN(parseInt(tokens[i])) && tokens[i] !== 'router' && tokens[i] !== 'node') {
        latency = parseInt(tokens[i++]);
      }

      if (bodyType === 'router') {
        routerIds.add(bodyId);
      } else {
        nodeIds.add(bodyId);
      }

      if (headType === 'router' && bodyType === 'node') {
        nodeAttachments[bodyId] = headId;
        edgeList.push({ sourceType: 'router', sourceId: headId, targetType: 'node', targetId: bodyId, latency });
      } else if (headType === 'node' && bodyType === 'router') {
        nodeAttachments[headId] = bodyId;
        edgeList.push({ sourceType: 'router', sourceId: bodyId, targetType: 'node', targetId: headId, latency });
      } else if (headType === 'router' && bodyType === 'router') {
        edgeList.push({ sourceType: 'router', sourceId: headId, targetType: 'router', targetId: bodyId, latency });
      }
    }
  });

  // Layout routers in a circle
  const routerArr = [...routerIds].sort((a, b) => a - b);
  const nodeArr = [...nodeIds].sort((a, b) => a - b);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.35;

  const nodes = [];

  routerArr.forEach((rid, idx) => {
    const angle = (2 * Math.PI * idx) / routerArr.length - Math.PI / 2;
    nodes.push({
      id: `router-${rid}`,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      type: 'router',
      label: `R${rid}`,
    });
  });

  // Place nodes near their attached router
  nodeArr.forEach((nid, idx) => {
    const attachedRouter = nodeAttachments[nid];
    const routerNode = nodes.find(n => n.id === `router-${attachedRouter}`);
    const offsetAngle = (Math.PI * 2 * idx) / Math.max(nodeArr.length, 1);
    const offsetR = 40;
    nodes.push({
      id: `node-${nid}`,
      x: (routerNode?.x || centerX) + offsetR * Math.cos(offsetAngle),
      y: (routerNode?.y || centerY) + offsetR * Math.sin(offsetAngle),
      type: 'node',
      label: `N${nid}`,
    });
  });

  // Deduplicate edges
  const edgeSet = new Set();
  const edges = [];
  edgeList.forEach(e => {
    const srcId = e.sourceType === 'router' ? `router-${e.sourceId}` : `node-${e.sourceId}`;
    const tgtId = e.targetType === 'router' ? `router-${e.targetId}` : `node-${e.targetId}`;
    const key = [srcId, tgtId].sort().join('::');
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        id: `edge-${edges.length}`,
        source: srcId,
        target: tgtId,
        latency: e.latency,
      });
    }
  });

  return { nodes, edges };
}

/**
 * Validate graph for anynet export.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGraph(nodes, edges) {
  const errors = [];
  const routers = nodes.filter(n => n.type === 'router');
  const procNodes = nodes.filter(n => n.type === 'node');

  if (routers.length === 0) {
    errors.push('Network must have at least one router.');
  }

  if (procNodes.length === 0) {
    errors.push('Network must have at least one processing node.');
  }

  // Check each node is connected to exactly one router
  procNodes.forEach(pn => {
    const connections = edges.filter(e =>
      (e.source === pn.id || e.target === pn.id)
    );
    const routerConns = connections.filter(e => {
      const otherId = e.source === pn.id ? e.target : e.source;
      const other = nodes.find(n => n.id === otherId);
      return other && other.type === 'router';
    });

    if (routerConns.length === 0) {
      errors.push(`Node "${pn.label || pn.id}" is not connected to any router.`);
    } else if (routerConns.length > 1) {
      errors.push(`Node "${pn.label || pn.id}" is connected to multiple routers (must be exactly one).`);
    }

    // Check no node↔node connections
    const nodeConns = connections.filter(e => {
      const otherId = e.source === pn.id ? e.target : e.source;
      const other = nodes.find(n => n.id === otherId);
      return other && other.type === 'node';
    });
    if (nodeConns.length > 0) {
      errors.push(`Node "${pn.label || pn.id}" is connected to another node (illegal).`);
    }
  });

  // Check for isolated routers (warning, not error)
  routers.forEach(r => {
    const connections = edges.filter(e => e.source === r.id || e.target === r.id);
    if (connections.length === 0) {
      errors.push(`Router "${r.label || r.id}" has no connections.`);
    }
  });

  return { valid: errors.length === 0, errors };
}
