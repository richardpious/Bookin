import { useState } from 'react';
export const ChatInput = ({ onSend, isLoading, isConnecting }) => {
  const [input, setInput] = useState('');
  const isBlocked = isLoading || isConnecting;

  return (
    <div className="chat-input-wrapper">
      <input
      type="text"
        className="chat-input-field"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && input.trim() && !isBlocked && (onSend(input), setInput(''))}
      placeholder={isConnecting ? 'Connecting...' : 'Type a message...'}
      disabled={isBlocked}
    />
    <button 
        className="chat-input-button"
      onClick={() => { input.trim() && !isBlocked && (onSend(input), setInput('')) }}
      disabled={isBlocked}
    >
      {isLoading ? '...' : 'Send'}
    </button>
  </div>
);
};

