import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export const ChatSidebar = React.memo(({ width, messages, isLoading, isConnecting, onSend, messagesEndRef, sessionId }) => {
  const hasSession = sessionId !== null && sessionId !== undefined;

  return (
  <aside className="sidebar agent-chat-sidebar" style={{ width, padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div className="sidebar-header" style={{ padding: '1.5rem', flexShrink: 0 }}><h2>Agent Chat</h2></div>

    {!hasSession ? (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        padding: '2rem',
        opacity: 0.75,
        textAlign: 'center'
      }}>
        <MessageSquare size={40} strokeWidth={1.2} />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>No session selected</span>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Create a new session from the sidebar to start chatting
        </span>
      </div>
    ) : (
      <>
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
        <AnimatePresence>
          {isConnecting && (
            <motion.div
              key="connecting-banner"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="connecting-banner"
            >
              <span className="connecting-dots">
                <span /><span /><span />
              </span>
              Connecting…
            </motion.div>
          )}
        </AnimatePresence>
        <div className="input-area">
            <ChatInput
              onSend={onSend}
              isLoading={isLoading}
              isConnecting={isConnecting}
            />
        </div>
      </>
    )}
  </aside>
);
});

