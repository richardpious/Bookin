import { useState, useCallback, useRef, useEffect } from 'react';

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

  // Initialize CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--left-sidebar-width', `${leftWidth}px`);
    document.documentElement.style.setProperty('--right-sidebar-width', `${rightWidth}px`);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isResizingLeft.current) {
      // Adding margin: 10px (left) + width + resizer + gap (approx)
      const newWidth = Math.max(150, Math.min(e.clientX - 20, window.innerWidth - savedRightWidth.current - 150));
      document.documentElement.style.setProperty('--left-sidebar-width', `${newWidth}px`);
      savedLeftWidth.current = newWidth;
    } else if (isResizingRight.current) {
      // Adding margin: 10px (right)
      const newRightWidth = window.innerWidth - e.clientX - 10;
      const clamped = Math.max(100, Math.min(newRightWidth, window.innerWidth - savedLeftWidth.current - 150));
      document.documentElement.style.setProperty('--right-sidebar-width', `${clamped}px`);
      savedRightWidth.current = clamped;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizingLeft.current = false;
    isResizingRight.current = false;
    document.body.style.userSelect = 'auto';
    document.body.classList.remove('is-resizing');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Sync React state
    setLeftWidth(savedLeftWidth.current);
    setRightWidth(savedRightWidth.current);
  }, [handleMouseMove]);

  const startResizing = (ref) => {
    ref.current = true;
    
    // Visually expand if collapsed
    if (ref === isResizingLeft) {
      setLeftCollapsed(false);
    } else {
      setRightCollapsed(false);
    }
    
    document.body.style.userSelect = 'none';
    document.body.classList.add('is-resizing');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleLeftCollapsed = useCallback(() => {
    setLeftCollapsed(prev => {
      if (!prev) {
        setLeftWidth(0);
        document.documentElement.style.setProperty('--left-sidebar-width', '0px');
        return true;
      } else {
        const restored = savedLeftWidth.current || 260;
        setLeftWidth(restored);
        document.documentElement.style.setProperty('--left-sidebar-width', `${restored}px`);
        return false;
      }
    });
  }, []);

  const toggleRightCollapsed = useCallback(() => {
    setRightCollapsed(prev => {
      if (!prev) {
        setRightWidth(0);
        document.documentElement.style.setProperty('--right-sidebar-width', '0px');
        return true;
      } else {
        const restored = savedRightWidth.current || 500;
        setRightWidth(restored);
        document.documentElement.style.setProperty('--right-sidebar-width', `${restored}px`);
        return false;
      }
    });
  }, []);

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
