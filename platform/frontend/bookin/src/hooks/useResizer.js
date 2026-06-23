import { useState, useCallback, useRef } from 'react';

export const useResizer = () => {
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(500);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  const handleMouseMove = useCallback((e) => {
    if (isResizingLeft.current) {
      setLeftWidth(Math.max(150, Math.min(e.clientX, 500)));
    } else if (isResizingRight.current) {
      setRightWidth(Math.max(100, Math.min(window.innerWidth - e.clientX, 1200)));
    }
  }, []);

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

  return {
    leftWidth,
    rightWidth,
    isResizingLeft,
    isResizingRight,
    startResizing
  };
};

