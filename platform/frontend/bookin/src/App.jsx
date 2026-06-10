import { useState, useRef, useCallback, useEffect } from 'react'
import { Header } from './components/Header'
import { Resizer } from './components/Resizer'
import { ChatSidebar } from './components/ChatSidebar'
import { LeftSidebar } from './components/LeftSidebar'
import { MainContentWindow } from './components/MainContentWindow'
import { readFileContent } from './utils/fileUtils'
import { fetchChatHistory } from './utils/historyUtils'

import { setupWebSocket } from './utils/wsUtils'
import './App.css'
import './index.css'

async function fetchSessions() {
  try {
    const response = await fetch('http://localhost:8000/sessions');
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [socket, setSocket] = useState(null)
  const [sessionId, setSessionId] = useState('default')
  const [sessions, setSessions] = useState([])
  // Tab management
  const [openFiles, setOpenFiles] = useState([]) // Array of file paths
  const [activeFile, setActiveFile] = useState(null)
  const [fileContents, setFileContents] = useState({}) // Map of path -> content

  const messagesEndRef = useRef(null)
  
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(500)
  const isResizingLeft = useRef(false)
  const isResizingRight = useRef(false)

  // Load initial sessions
  useEffect(() => {
    const loadSessions = async () => {
      const data = await fetchSessions()
      setSessions(data)
    }
    loadSessions()
  }, [])

  // Load chat history when sessionId changes
  useEffect(() => {
    const loadHistory = async () => {
      const history = await fetchChatHistory(sessionId)
      setMessages(history.length > 0 ? history : [{ id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' }])
    }
    loadHistory()
  }, [sessionId])

  useEffect(() => {
    const ws = setupWebSocket(sessionId, setMessages, setIsLoading, handleOpenSimPreview)
    setSocket(ws)
    return () => ws.close()
  }, [sessionId])
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
  const handleOpenSimPreview = (previewData) => {
    console.log("handleOpenSimPreview called with:", previewData);
    const fileName = previewData.config_file || `preview-${Date.now()}.json`;
    // We store the data object directly instead of stringifying it
    if (!openFiles.includes(fileName)) {
      console.log("Opening new tab for:", fileName);
      setOpenFiles(prev => [...prev, fileName]);
      setFileContents(prev => ({ ...prev, [fileName]: previewData }));
    }
    setActiveFile(fileName);
  };

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

  const handleSend = async (text) => {
    if (text.trim() && socket) {
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: text }]);
      setIsLoading(true);
      socket.send(text)
    }
  }

  return (
    <div className="app-container">
      <Header />
      <div className="main-layout">
        <LeftSidebar
            width={leftWidth}
            onFileClick={handleFileClick}
          activeFile={activeFile}
            sessions={sessions}
            setSessions={setSessions}
            currentSession={sessionId}
            onSelectSession={setSessionId}
        />
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
          onSend={handleSend}
          messagesEndRef={messagesEndRef}
        />
    </div>
    </div>
  )
}

export default App

