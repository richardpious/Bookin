import { useState, useRef, useCallback, useEffect } from 'react'
import { Header } from './components/Header'
import { Resizer } from './components/Resizer'
import { ChatSidebar } from './components/ChatSidebar'
import { FilesSidebar } from './components/FilesSidebar'
import { MainContentWindow } from './components/MainContentWindow'
import { readFileContent } from './utils/fileUtils'

import { setupWebSocket } from './utils/wsUtils'
import './App.css'
import './index.css'

function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [socket, setSocket] = useState(null)
  const [activeFile, setActiveFile] = useState(null)
  const [fileContent, setFileContent] = useState('')

  const messagesEndRef = useRef(null)
  
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(350)
  const isResizingLeft = useRef(false)
  const isResizingRight = useRef(false)

  useEffect(() => {

    const ws = setupWebSocket('default', setMessages, setIsLoading)
    setSocket(ws)
    return () => ws.close()
  }, [])

  const handleFileClick = async (path) => {
    setActiveFile(path)
    try {
      const content = await readFileContent(path)
      setFileContent(content)
    } catch (err) {
      console.error(err)
      setFileContent('Error loading file content.')
    }
  }
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
    if (input.trim() && socket) {
      const currentInput = input;
      setInput('')
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: currentInput }]);
      setIsLoading(true);
      socket.send(currentInput)
    }
  }

  return (
    <div className="app-container">
      <Header />
      <div className="main-layout">
        <FilesSidebar width={leftWidth} onFileClick={handleFileClick} activeFile={activeFile} />
        <Resizer onMouseDown={() => startResizing(isResizingLeft)} />
        
        <MainContentWindow filePath={activeFile} content={fileContent} />
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
    </div>
  )
}

export default App

