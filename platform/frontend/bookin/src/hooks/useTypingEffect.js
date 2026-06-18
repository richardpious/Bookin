import { useState, useEffect, useRef } from 'react';

export const useTypingEffect = (fullText, isComplete) => {
  const [displayedText, setDisplayedText] = useState("");
  const index = useRef(0);
  const lastFullTextRef = useRef(fullText);

  useEffect(() => {
    // If the message is marked complete, show everything immediately
    if (isComplete) {
      setDisplayedText(fullText);
      return;
    }

    // If the fullText has changed (new chunk arrived)
    if (fullText !== lastFullTextRef.current) {
      // If we are currently behind the new fullText, don't reset.
      // Just let the interval continue typing towards the new length.
      lastFullTextRef.current = fullText;
    }

    // Typing animation logic
    if (index.current < fullText.length) {
      const timeout = setTimeout(() => {
        // Only update if we are not complete
        if (!isComplete) {
          setDisplayedText(fullText.slice(0, index.current + 1));
          index.current++;
        }
      }, 5); 
      return () => clearTimeout(timeout);
    }
  }, [fullText, isComplete]);

  return displayedText;
};

