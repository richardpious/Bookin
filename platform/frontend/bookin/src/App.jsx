import { useState, useEffect, useRef } from 'react'
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async () => {
    if (input.trim()) {
      const currentInput = input;
      setInput('')
      setIsLoading(true)
      await sendMessage(currentInput, setMessages)
      setIsLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="app-container"
    >
      <Sidebar />
      <main className="main-content">
        <div className="messages">
          <AnimatePresence>
            {messages.map(msg => (
              <ChatMessage key={msg.id} sender={msg.sender} text={msg.text} />
            ))}
            {isLoading && (
              <motion.div 
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
          <div className="input-wrapper">
             <ChatInput input={input} setInput={setInput} onSend={handleSend} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </motion.div>
  )
}

export default App
