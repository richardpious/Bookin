import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export const ChatSidebar = ({ width, messages, isLoading, onSend, messagesEndRef }) => {
  const [input, setInput] = useState('');

  return (
  <aside className="sidebar agent-chat-sidebar" style={{ width }}>
    <div className="sidebar-header"><h2>Agent Chat</h2></div>
    <div className="messages">
      <AnimatePresence>
        {messages.map(msg => (
          <ChatMessage key={msg.id} sender={msg.sender} text={msg.text} />
        ))}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="message-wrapper bot"
          >
            <div className="message-bubble bot loading"><div className="pulse">...</div></div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </AnimatePresence>
    </div>
    <div className="input-area">
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => { onSend(input); setInput(''); }}
          isLoading={isLoading}
        />
    </div>
  </aside>
);
};

