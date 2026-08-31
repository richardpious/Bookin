import re

with open("platform/frontend/bookin/src/components/network/NetworkVisualizer.jsx", "r") as f:
    content = f.read()

# Chunk 1: Add svgRef
content = content.replace("const canvasRef = useRef(null);", "const canvasRef = useRef(null);\n  const svgRef = useRef(null);")

# Chunk 2: Update handleWheel
old_wheel = """  const handleWheel = useCallback((e) => {
    // scale delta
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      let newScale = prev.scale * scaleAdjust;
      // Constrain scale between 0.5 and 6
      newScale = Math.max(0.5, Math.min(newScale, 6));

      if (newScale === prev.scale) return prev; // no change

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate how much the mouse position shifts due to scaling
        const deltaX = (mouseX - prev.x) * (newScale / prev.scale - 1);
        const deltaY = (mouseY - prev.y) * (newScale / prev.scale - 1);

        return {
          x: prev.x - deltaX,
          y: prev.y - deltaY,
          scale: newScale,
        };
      }
      return { ...prev, scale: newScale };
    });
  }, []);"""

new_wheel = """  const handleWheel = useCallback((e) => {
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      let newScale = prev.scale * scaleAdjust;
      newScale = Math.max(0.5, Math.min(newScale, 6));

      if (newScale === prev.scale) return prev;

      if (svgRef.current) {
        const point = svgRef.current.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const svgP = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
        
        const mouseX = svgP.x;
        const mouseY = svgP.y;

        const deltaX = (mouseX - prev.x) * (newScale / prev.scale - 1);
        const deltaY = (mouseY - prev.y) * (newScale / prev.scale - 1);

        return {
          x: prev.x - deltaX,
          y: prev.y - deltaY,
          scale: newScale,
        };
      }
      return { ...prev, scale: newScale };
    });
  }, []);"""
content = content.replace(old_wheel, new_wheel)

# Chunk 3: Update handleMouseDown and handleMouseMove
old_mouse = """  const handleMouseDown = useCallback((e) => {
    // Only drag with left click, and don't drag if clicking a router or flit
    if (e.button !== 0 || e.target.closest('.router-node') || e.target.closest('.flit-dot')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  }, [isDragging, dragStart]);"""

new_mouse = """  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('.router-node') || e.target.closest('.flit-dot')) return;
    setIsDragging(true);
    if (svgRef.current) {
      const point = svgRef.current.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const svgP = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
      setDragStart({ x: svgP.x - transform.x, y: svgP.y - transform.y });
    } else {
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      if (svgRef.current) {
        const point = svgRef.current.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const svgP = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
        setTransform(prev => ({
          ...prev,
          x: svgP.x - dragStart.x,
          y: svgP.y - dragStart.y
        }));
      } else {
        setTransform(prev => ({
          ...prev,
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        }));
      }
    }
  }, [isDragging, dragStart]);"""
content = content.replace(old_mouse, new_mouse)

# Chunk 4: attach ref to SVG
old_svg_tag = """        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}"""
new_svg_tag = """        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}"""
content = content.replace(old_svg_tag, new_svg_tag)

with open("platform/frontend/bookin/src/components/network/NetworkVisualizer.jsx", "w") as f:
    f.write(content)

print("Fixed zoom center")
