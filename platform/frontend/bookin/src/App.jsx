import { useState, useRef, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Resizer } from './components/Resizer'
import { ChatSidebar } from './components/ChatSidebar'
import { FilesSidebar } from './components/FilesSidebar'
import { MainContentWindow } from './components/MainContentWindow'
import { sendMessage } from './utils/chatUtils'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I help you with BookIn today?' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  
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
    document.body.style.userSelect = 'auto'
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const startResizing = (ref) => {
    ref.current = true
    document.body.style.userSelect = 'none'
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
      <FilesSidebar width={leftWidth}>
        <Sidebar />
      </FilesSidebar>
      <Resizer onMouseDown={() => startResizing(isResizingLeft)} />
      
      <MainContentWindow>
        <h1>Main Content Area</h1>
      </MainContentWindow>
      <Resizer onMouseDown={() => startResizing(isResizingRight)} />
      
      <ChatSidebar 
        width={rightWidth}
        messages={messages}
        isLoading={isLoading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        messagesEndRef={messagesEndRef}
      />
    </div>
  )
}

export default App

