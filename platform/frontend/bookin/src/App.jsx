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

  // Tab management
  const [openFiles, setOpenFiles] = useState([]) // Array of file paths
  const [activeFile, setActiveFile] = useState(null)
  const [fileContents, setFileContents] = useState({}) // Map of path -> content

  const messagesEndRef = useRef(null)
  
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(500)
  const isResizingLeft = useRef(false)
  const isResizingRight = useRef(false)

  useEffect(() => {

    const ws = setupWebSocket('default', setMessages, setIsLoading)
    setSocket(ws)
    return () => ws.close()
  }, [])

  const handleFileClick = async (path) => {
    if (!openFiles.includes(path)) {
      setOpenFiles([...openFiles, path])
      try {
      const content = await readFileContent(path)
        setFileContents(prev => ({ ...prev, [path]: content }))
    } catch (err) {
      console.error(err)
        setFileContents(prev => ({ ...prev, [path]: 'Error loading file content.' }))
    }
  }
    setActiveFile(path)
  }
  const handleCloseFile = (e, path) => {
    e.stopPropagation()
    const newOpenFiles = openFiles.filter(f => f !== path)
    setOpenFiles(newOpenFiles)

    if (activeFile === path) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null)
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
        
        <MainContentWindow
          openFiles={openFiles}
          activeFile={activeFile}
          fileContents={fileContents}
          onTabClick={setActiveFile}
          onCloseTab={handleCloseFile}
        />
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

