import { useMemo, useRef, useState, useEffect } from 'react';
import { Network, Pencil } from 'lucide-react';
import NetworkTopologyCanvas from './NetworkTopologyCanvas';
import './MeshTopologyViz.css';

/**
 * MeshTopologyViz — Computes mesh node positions and edges from k and n,
 * then renders them via NetworkTopologyCanvas in read-only mode.
 *
 * @param {Object} props
 * @param {number} props.k - Nodes per dimension (radix)
 * @param {number} props.n - Number of dimensions (1, 2, or 3+)
 */
const MeshTopologyViz = ({ k, n, topology = 'mesh', onEnterEditMode, showEditButton }) => {
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  // Observe container width so the canvas is responsive
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setCanvasSize(prev => {
            if (Math.abs(prev.width - w) < 2) return prev;
            return { width: w, height: Math.max(300, Math.min(w * 0.75, 500)) };
          });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isTorus = topology === 'torus';

  // Compute mesh/torus nodes and edges
  const { nodes, edges, totalNodes, totalEdges, displayLabel } = useMemo(() => {
    const safeK = Math.max(1, Math.min(k, 32));
    const safeN = Math.max(1, Math.min(n, 8));
    const total = Math.pow(safeK, safeN);
    const topoName = isTorus ? 'Torus' : 'Mesh';

    // Scaling guard: if too many nodes, don't compute
    if (total > 256) {
      return {
        nodes: [],
        edges: [],
        totalNodes: total,
        totalEdges: 0,
        displayLabel: `${safeK}${'×' + safeK}`.repeat(safeN - 1) + ` ${topoName} — ${total} routers (too large to visualize)`,
      };
    }

    const resultNodes = [];
    const resultEdges = [];

    if (safeN === 1) {
      // 1D mesh/torus: horizontal line / ring
      const padding = 60;
      const availableWidth = canvasSize.width - padding * 2;
      const spacing = safeK > 1 ? availableWidth / (safeK - 1) : 0;
      const yCenter = canvasSize.height / 2;

      for (let i = 0; i < safeK; i++) {
        resultNodes.push({
          id: i,
          x: padding + i * spacing,
          y: yCenter,
          label: `${i}`,
        });
        if (i < safeK - 1) {
          resultEdges.push({ source: i, target: i + 1 });
        }
      }

      if (isTorus && safeK > 1) {
        resultEdges.push({
          source: safeK - 1,
          target: 0,
          isWrapAround: true,
          axis: 'horizontal',
          index: 0,
        });
      }

      return {
        nodes: resultNodes,
        edges: resultEdges,
        totalNodes: safeK,
        totalEdges: isTorus ? safeK : resultEdges.length,
        displayLabel: `1×${safeK} ${isTorus ? 'Ring / Torus' : 'Mesh'}`,
      };
    }

    if (safeN === 2) {
      // 2D grid
      const padding = 60;
      const availableWidth = canvasSize.width - padding * 2;
      const availableHeight = canvasSize.height - padding * 2;
      const spacingX = safeK > 1 ? availableWidth / (safeK - 1) : 0;
      const spacingY = safeK > 1 ? availableHeight / (safeK - 1) : 0;
      const spacing = Math.min(spacingX, spacingY);

      // Center the grid
      const gridWidth = (safeK - 1) * spacing;
      const gridHeight = (safeK - 1) * spacing;
      const offsetX = (canvasSize.width - gridWidth) / 2;
      const offsetY = (canvasSize.height - gridHeight) / 2;

      for (let row = 0; row < safeK; row++) {
        for (let col = 0; col < safeK; col++) {
          const id = row * safeK + col;
          resultNodes.push({
            id,
            x: offsetX + col * spacing,
            y: offsetY + row * spacing,
            label: `${id}`,
          });

          // Right neighbor
          if (col < safeK - 1) {
            resultEdges.push({ source: id, target: id + 1 });
          } else if (isTorus && safeK > 1) {
            // Horizontal wrap-around link from col k-1 back to col 0
            resultEdges.push({
              source: id,
              target: row * safeK,
              isWrapAround: true,
              axis: 'horizontal',
              index: row,
            });
          }

          // Bottom neighbor
          if (row < safeK - 1) {
            resultEdges.push({ source: id, target: id + safeK });
          } else if (isTorus && safeK > 1) {
            // Vertical wrap-around link from row k-1 back to row 0
            resultEdges.push({
              source: id,
              target: col,
              isWrapAround: true,
              axis: 'vertical',
              index: col,
            });
          }
        }
      }

      const calculatedEdges = isTorus ? (2 * safeK * safeK) : resultEdges.length;

      return {
        nodes: resultNodes,
        edges: resultEdges,
        totalNodes: safeK * safeK,
        totalEdges: calculatedEdges,
        displayLabel: `${safeK}×${safeK} ${topoName}`,
      };
    }

    // n >= 3: show one 2D slice and note the total
    const padding = 60;
    const availableWidth = canvasSize.width - padding * 2;
    const availableHeight = canvasSize.height - padding * 2;
    const spacingX = safeK > 1 ? availableWidth / (safeK - 1) : 0;
    const spacingY = safeK > 1 ? availableHeight / (safeK - 1) : 0;
    const spacing = Math.min(spacingX, spacingY);

    const gridWidth = (safeK - 1) * spacing;
    const gridHeight = (safeK - 1) * spacing;
    const offsetX = (canvasSize.width - gridWidth) / 2;
    const offsetY = (canvasSize.height - gridHeight) / 2;

    for (let row = 0; row < safeK; row++) {
      for (let col = 0; col < safeK; col++) {
        const id = row * safeK + col;
        resultNodes.push({
          id,
          x: offsetX + col * spacing,
          y: offsetY + row * spacing,
          label: `${id}`,
        });
        if (col < safeK - 1) {
          resultEdges.push({ source: id, target: id + 1 });
        } else if (isTorus && safeK > 1) {
          resultEdges.push({
            source: id,
            target: row * safeK,
            isWrapAround: true,
            axis: 'horizontal',
            index: row,
          });
        }
        if (row < safeK - 1) {
          resultEdges.push({ source: id, target: id + safeK });
        } else if (isTorus && safeK > 1) {
          resultEdges.push({
            source: id,
            target: col,
            isWrapAround: true,
            axis: 'vertical',
            index: col,
          });
        }
      }
    }

    const dims = Array(safeN).fill(safeK).join('×');
    const totalEdgesCount = isTorus
      ? (safeN * Math.pow(safeK, safeN))
      : (safeN * Math.pow(safeK, safeN - 1) * (safeK - 1));

    return {
      nodes: resultNodes,
      edges: resultEdges,
      totalNodes: total,
      totalEdges: totalEdgesCount,
      displayLabel: `${dims} ${topoName}`,
    };
  }, [k, n, topology, isTorus, canvasSize]);

  const isTooLarge = Math.pow(Math.max(1, Math.min(k, 32)), Math.max(1, Math.min(n, 8))) > 256;
  const isSliced = n >= 3 && !isTooLarge;

  return (
    <div className="mesh-topology-viz simulation-card">
      <div className="simulation-card-header">
        <Network size={20} />
        <h3>Network Topology</h3>
        {showEditButton && onEnterEditMode && (
          <button className="edit-topology-btn" onClick={onEnterEditMode}>
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>

      <div className="mesh-viz-body">
        <div className="mesh-viz-info">
          <span className="mesh-viz-label">{displayLabel}</span>
          <span className="mesh-viz-stats">
            {totalNodes} router{totalNodes !== 1 ? 's' : ''}
            {totalEdges > 0 && <> &middot; {totalEdges} link{totalEdges !== 1 ? 's' : ''}</>}
          </span>
        </div>

        {isSliced && (
          <div className="mesh-viz-notice">
            Showing 1 layer ({k}×{k}) of the {n}D mesh
          </div>
        )}

        {isTooLarge ? (
          <div className="mesh-viz-too-large">
            <p>Topology too large to visualize ({totalNodes} routers).</p>
            <p>Reduce <code>k</code> or <code>n</code> to render the graph.</p>
          </div>
        ) : (
          <div className="mesh-viz-canvas-wrapper" ref={containerRef}>
            {nodes.length > 0 && (
              <NetworkTopologyCanvas
                nodes={nodes}
                edges={edges}
                interactive={false}
                width={canvasSize.width}
                height={canvasSize.height}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeshTopologyViz;
