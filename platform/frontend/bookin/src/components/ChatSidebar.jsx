import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export const ChatSidebar = React.memo(({ width, messages, isLoading, onSend, messagesEndRef }) => {
  return (
  <aside className="sidebar agent-chat-sidebar" style={{ width, padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div className="sidebar-header" style={{ padding: '1.5rem', flexShrink: 0 }}><h2>Agent Chat</h2></div>
    <div className="messages" style={{ flex: 1, overflowY: 'auto' }}>
      <AnimatePresence initial={false}>
        {messages.map(msg => (
          <ChatMessage key={msg.id} sender={msg.sender === 'agent' ? 'bot' : msg.sender} text={msg.text} isError={msg.isError} />
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
          onSend={onSend}
          isLoading={isLoading}
        />
    </div>
  </aside>
);
});

