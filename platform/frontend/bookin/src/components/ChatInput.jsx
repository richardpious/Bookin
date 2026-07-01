import { useState } from 'react';
export const ChatInput = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');

  return (
    <div className="chat-input-wrapper">
      <input
      type="text"
        className="chat-input-field"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && input.trim() && (onSend(input), setInput(''))}
      placeholder="Type a message..."
    />
    <button 
        className="chat-input-button"
      onClick={() => { input.trim() && (onSend(input), setInput('')) }}
    >
      {isLoading ? '...' : 'Send'}
    </button>
  </div>
);
};

