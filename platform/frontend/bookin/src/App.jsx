import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './components/Sidebar'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { sendMessage } from './utils/chatUtils'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I help you with BookIn today?' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Sidebar widths
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(350)
  const isResizingLeft = useRef(false)
  const isResizingRight = useRef(false)

  const handleMouseMove = useCallback((e) => {
    if (isResizingLeft.current) {
      setLeftWidth(Math.max(150, Math.min(e.clientX, 500)))
    } else if (isResizingRight.current) {
      setRightWidth(Math.max(250, Math.min(window.innerWidth - e.clientX, 600)))
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizingLeft.current = false
    isResizingRight.current = false
    document.body.style.userSelect = 'auto' // Re-enable selection
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const startResizingLeft = () => {
    isResizingLeft.current = true
    document.body.style.userSelect = 'none' // Disable selection while resizing
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const startResizingRight = () => {
    isResizingRight.current = true
    document.body.style.userSelect = 'none' // Disable selection while resizing
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleSend = async () => {
    if (input.trim()) {
      const currentInput = input;
      setInput('')
      await sendMessage(currentInput, setMessages, setIsLoading)
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar" style={{ width: leftWidth }}>
        <Sidebar />
      </aside>
      <div className="resizer" onMouseDown={startResizingLeft} />
      
      <main className="main-content">
        <h1>Main Content Area</h1>
      </main>

      <div className="resizer" onMouseDown={startResizingRight} />
      <aside className="sidebar agent-chat-sidebar" style={{ width: rightWidth }}>
        <div className="sidebar-header"><h2>Agent Chat</h2></div>
        <div className="messages">
          <AnimatePresence>
            {messages.map(msg => (
              <ChatMessage key={msg.id} sender={msg.sender} text={msg.text} />
            ))}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="message-wrapper bot"
              >
                <div className="message-bubble bot loading">
                  <div className="pulse">...</div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </div>
        <div className="input-area">
          <ChatInput input={input} setInput={setInput} onSend={handleSend} isLoading={isLoading} />
        </div>
      </aside>
    </div>
  )
}

export default App

