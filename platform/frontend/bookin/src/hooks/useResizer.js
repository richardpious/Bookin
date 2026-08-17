import { useState, useCallback, useRef } from 'react';

export const useResizer = () => {
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(500);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // Collapse state
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const savedLeftWidth = useRef(260);
  const savedRightWidth = useRef(500);

  const handleMouseMove = useCallback((e) => {
    if (isResizingLeft.current) {
      // Adding margin: 10px (left) + width + resizer + gap (approx)
      const newWidth = Math.max(150, Math.min(e.clientX - 20, window.innerWidth - rightWidth - 150));
      setLeftWidth(newWidth);
      savedLeftWidth.current = newWidth;
      setLeftCollapsed(false);
    } else if (isResizingRight.current) {
      // Adding margin: 10px (right)
      const newRightWidth = window.innerWidth - e.clientX - 10;
      const clamped = Math.max(100, Math.min(newRightWidth, window.innerWidth - leftWidth - 150));
      setRightWidth(clamped);
      savedRightWidth.current = clamped;
      setRightCollapsed(false);
    }
  }, [leftWidth, rightWidth]);

  const handleMouseUp = useCallback(() => {
    isResizingLeft.current = false;
    isResizingRight.current = false;
    document.body.style.userSelect = 'auto';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const startResizing = (ref) => {
    ref.current = true;
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleLeftCollapsed = useCallback(() => {
    setLeftCollapsed(prev => {
      if (!prev) {
        // Collapsing — save current width
        savedLeftWidth.current = leftWidth;
        setLeftWidth(0);
        return true;
      } else {
        // Expanding — restore saved width
        setLeftWidth(savedLeftWidth.current || 260);
        return false;
      }
    });
  }, [leftWidth]);

  const toggleRightCollapsed = useCallback(() => {
    setRightCollapsed(prev => {
      if (!prev) {
        savedRightWidth.current = rightWidth;
        setRightWidth(0);
        return true;
      } else {
        setRightWidth(savedRightWidth.current || 500);
        return false;
      }
    });
  }, [rightWidth]);

  return {
    leftWidth,
    rightWidth,
    isResizingLeft,
    isResizingRight,
    startResizing,
    leftCollapsed,
    rightCollapsed,
    toggleLeftCollapsed,
    toggleRightCollapsed
  };
};
