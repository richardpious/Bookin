import { useState, useRef, useEffect, useMemo } from 'react';
import { Network, Pencil } from 'lucide-react';
import NetworkTopologyCanvas from './NetworkTopologyCanvas';
import { readFileContent } from '../../utils/fileUtils';
import { anynetToGraph } from '../../utils/anynetSerializer';
import './MeshTopologyViz.css'; // Reuse mesh styles

const AnynetTopologyViz = ({ anynetFilePath, onEnterEditMode, showEditButton }) => {
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [rawContent, setRawContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Observe container width
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

  const [layoutData, setLayoutData] = useState(null);

  // Fetch anynet file content and optional layout file content
  useEffect(() => {
    if (!anynetFilePath) {
      setIsLoading(false);
      setRawContent(null);
      setLayoutData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const layoutFilePath = `${anynetFilePath}.layout.json`;

    Promise.allSettled([
      readFileContent(anynetFilePath),
      readFileContent(layoutFilePath)
    ]).then(([anynetRes, layoutRes]) => {
      if (anynetRes.status === 'fulfilled') {
        setRawContent(anynetRes.value.content);
      } else {
        throw new Error('Failed to load anynet file');
      }

      if (layoutRes.status === 'fulfilled') {
        try {
          const parsed = JSON.parse(layoutRes.value.content);
          if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
            setLayoutData(parsed);
          } else {
            setLayoutData(null);
          }
        } catch {
          setLayoutData(null);
        }
      } else {
        setLayoutData(null);
      }

      setIsLoading(false);
    }).catch(err => {
      console.error('Failed to load anynet file:', err);
      setError('Failed to load custom topology file.');
      setIsLoading(false);
    });
  }, [anynetFilePath]);

  // Compute graph data dynamically (using saved layout if present)
  const graphData = useMemo(() => {
    if (!rawContent || canvasSize.width === 0) return { nodes: [], edges: [] };
    try {
      const autoGraph = anynetToGraph(rawContent, canvasSize.width, canvasSize.height);
      if (!layoutData || !Array.isArray(layoutData.nodes) || layoutData.nodes.length === 0) {
        return autoGraph;
      }

      const posMap = {};
      layoutData.nodes.forEach(n => {
        posMap[n.id] = { x: n.x, y: n.y };
        if (n.label) posMap[n.label] = { x: n.x, y: n.y };
      });

      const mergedNodes = autoGraph.nodes.map(node => {
        const savedPos = posMap[node.id] || posMap[node.label];
        if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
          return { ...node, x: savedPos.x, y: savedPos.y };
        }
        return node;
      });

      return { nodes: mergedNodes, edges: autoGraph.edges };
    } catch (err) {
      console.error('Error parsing anynet graph:', err);
      return { nodes: [], edges: [] };
    }
  }, [rawContent, layoutData, canvasSize.width, canvasSize.height]);

  const numRouters = graphData.nodes.filter(n => n.type === 'router').length;
  const numNodes = graphData.nodes.filter(n => n.type === 'node').length;
  const numEdges = graphData.edges.length;

  return (
    <div className="mesh-topology-viz simulation-card">
      <div className="simulation-card-header">
        <Network size={20} />
        <h3>Custom Topology (anynet)</h3>
        {showEditButton && onEnterEditMode && (
          <button className="edit-topology-btn" onClick={onEnterEditMode}>
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>

      <div className="mesh-viz-body">
        <div className="mesh-viz-info">
          <span className="mesh-viz-label">Anynet File</span>
          <span className="mesh-viz-stats">
            {numRouters} routers &middot; {numNodes} nodes &middot; {numEdges} links
          </span>
        </div>

        {error ? (
          <div className="mesh-viz-too-large">
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        ) : !anynetFilePath ? (
          <div className="mesh-viz-too-large">
            <p>No network file specified. Click Edit to create custom topology.</p>
          </div>
        ) : isLoading ? (
          <div className="mesh-viz-too-large">
            <p>Loading topology...</p>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="mesh-viz-too-large">
            <p>No nodes found in topology.</p>
          </div>
        ) : (
          <div className="mesh-viz-canvas-wrapper" ref={containerRef}>
            <NetworkTopologyCanvas
              nodes={graphData.nodes}
              edges={graphData.edges}
              interactive={false}
              width={canvasSize.width}
              height={canvasSize.height}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnynetTopologyViz;
