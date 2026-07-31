import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { Square } from 'lucide-react';

export const ChatInput = React.forwardRef(({ onSend, onAbort, isLoading, isConnecting }, ref) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

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
    if (input.trim() && !isLoading && !isConnecting) {
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
            if (isLoading) return;
            handleSend();
          }
        }}
        placeholder={isConnecting ? 'Connecting...' : isLoading ? 'Agent is responding...' : 'Type a message...'}
        disabled={isConnecting}
        rows={1}
      />
      {isLoading ? (
        <button
          className="chat-stop-button"
          onClick={onAbort}
          title="Stop agent"
          aria-label="Stop agent"
        >
          <Square size={14} />
          Stop
        </button>
      ) : (
        <button
          className="chat-input-button"
          onClick={handleSend}
          disabled={isConnecting || !input.trim()}
        >
          Send
        </button>
      )}
    </div>
  );
});
