import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
export const ChatInput = React.forwardRef(({ onSend, isLoading, isConnecting }, ref) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  const isBlocked = isLoading || isConnecting;

  // Expose the internal textarea ref to the parent
  useImperativeHandle(ref, () => textareaRef.current);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isBlocked) {
      onSend(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="chat-input-wrapper">
      <textarea
        ref={textareaRef}
        className="chat-input-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={isConnecting ? 'Connecting...' : 'Type a message...'}
        disabled={isBlocked}
        rows={1}
      />
    <button 
        className="chat-input-button"
      onClick={handleSend}
      disabled={isBlocked}
    >
      {isLoading ? '...' : 'Send'}
    </button>
  </div>
);
});
