import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import ToolAccordion from './ToolAccordion';
export const ChatSidebar = React.memo(({ width, messages, isLoading, isConnecting, onSend, messagesEndRef, sessionId, chatInputRef }) => {
  const hasSession = sessionId !== null && sessionId !== undefined;

  // Memoize message grouping so it only recomputes when messages change
  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, msg) => {
      if (msg.isStatus) {
        if (acc.length > 0 && acc[acc.length - 1].isToolGroup) {
          acc[acc.length - 1].tools.push(msg);
        } else {
          acc.push({ id: `group-${msg.id}`, isToolGroup: true, tools: [msg] });
        }
      } else {
        acc.push(msg);
      }
      return acc;
    }, []);
  }, [messages]);

  return (
  <aside className="sidebar agent-chat-sidebar" style={{ width }}>
    <div className="sidebar-header"><h2>Agent Chat</h2></div>

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
        <div className="messages">
          <AnimatePresence initial={false}>
            {groupedMessages.map(msg => (
              msg.isToolGroup ? (
                <ToolAccordion key={msg.id} tools={msg.tools} />
              ) : (
                <ChatMessage key={msg.id} sender={msg.sender === 'agent' ? 'bot' : msg.sender} text={msg.text} isError={msg.isError} />
              )
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
              ref={chatInputRef}
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

