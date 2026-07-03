import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { Resizer } from './components/Resizer'
import { ChatSidebar } from './components/ChatSidebar'
import { LeftSidebar } from './components/LeftSidebar'
import { MainContentWindow } from './components/MainContentWindow'
import ApprovalModal from './components/ApprovalModal'
import SearchResultsPanel from './components/SearchResultsPanel'
import { useResizer } from './hooks/useResizer'
import { useFileManagement } from './hooks/useFileManagement'
import { useChatManagement } from './hooks/useChatManagement'
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
  const [sessionId, setSessionId] = useState('default')
  const [sessions, setSessions] = useState([])
  const [approvalRequest, setApprovalRequest] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLine, setActiveLine] = useState(null)

  const { leftWidth, rightWidth, isResizingLeft, isResizingRight, startResizing } = useResizer();
  const { openFiles, activeFile, fileContents, handleFileClick, handleOpenFilePreview, handleCloseFile, handleUpdateFileContent, setActiveFile } = useFileManagement();

  const handleRequireApproval = useCallback((data) => {
    setApprovalRequest(data);
  }, []);
  const { messages, isLoading, handleSend, setMessages, messagesEndRef } = useChatManagement(
    sessionId,
    handleOpenFilePreview,
    handleRequireApproval
  );

  const handleModelChange = useCallback(async (modelId) => {
    console.log("Model changed to:", modelId);

    try {
      const response = await fetch('http://localhost:8000/set-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          model: modelId
        })
      });
      const data = await response.json();
      console.log("Model switch response:", data);
      return data;
    } catch (err) {
      console.error("Error setting model:", err);
      throw err;
    }
  }, [sessionId]);

  const handleThinkingLevelChange = useCallback(async (level) => {
    console.log("Thinking level changed to:", level);
    try {
      // Assuming a backend route exists for this as well,
      // based on the provided message format requirements
      const response = await fetch('http://localhost:8000/set-thinking-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `agent:main:webchat:${sessionId}`,
          agentId: "main",
          thinkingLevel: level
        })
      });
      const data = await response.json();
      console.log("Thinking level switch response:", data);
      return data;
    } catch (err) {
      console.error("Error setting thinking level:", err);
      throw err;
    }
  }, [sessionId]);

  // Load initial sessions
  useEffect(() => {
    const loadSessions = async () => {
      const data = await fetchSessions()
      setSessions(data)
    }
    loadSessions()
  }, [])

  const handleDeleteSession = useCallback(async (session, shouldReopen = false) => {
    try {
      const response = await fetch(`http://localhost:8000/delete_session/${session}`, { method: 'POST' });
      let responseData = {};
      try {
        responseData = await response.json();
      } catch (e) {
        // ignore JSON parse error
      }

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || responseData.message || 'Failed to delete session');
      }

      const newSessions = await fetchSessions();
      console.log("Updated sessions:", newSessions);

      // Ensure the reset session is kept in the list
      if (shouldReopen && !newSessions.includes(session)) {
          setSessions([session, ...newSessions]);
      } else {
          setSessions(newSessions);
      }

      if (sessionId === session) {
        if (shouldReopen) {
         
          // Also set it in the UI so the user sees the message
          setMessages([{ id: 1, sender: 'bot', text: 'Session reset successfully. How can I help you?' }]);
        } else {
          setMessages([{ id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' }]);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting session: ${err.message}`);
    }
  }, [sessionId, setMessages]);
  const handleSearch = useCallback((results, query) => {
    setSearchResults(results);
    setSearchQuery(query);
  }, []);

  const handleOpenFileFromSearch = useCallback(async (filePath, lineNumber) => {
    // Wait for the file to be opened and the actual path to be resolved
    const resolvedPath = await handleFileClick(filePath);
    setActiveLine(lineNumber);
    console.log(`Opened ${resolvedPath} at line ${lineNumber}`);
  }, [handleFileClick]);

  return (
    <div className="app-container">
      <Header
        onModelChange={handleModelChange}
        onThinkingLevelChange={handleThinkingLevelChange}
        sessionId={sessionId}
        onSearch={handleSearch}
      />
      <ApprovalModal
        isOpen={!!approvalRequest}
        approvalRequest={approvalRequest}
        setApprovalRequest={setApprovalRequest}
      />
      {searchResults !== null && (
        <SearchResultsPanel
          results={searchResults}
          query={searchQuery}
          onOpenFile={handleOpenFileFromSearch}
          onClose={() => setSearchResults(null)}
        />
      )}
      <div className="main-layout" style={{ zIndex: 'auto', position: 'relative', overflow: 'hidden' }}>
        <LeftSidebar
            width={leftWidth}
            onFileClick={handleFileClick}
          activeFile={activeFile}
            sessions={sessions}
            setSessions={setSessions}
            currentSession={sessionId}
            onSelectSession={setSessionId}
            onResetSession={handleDeleteSession}
        />
        <Resizer onMouseDown={() => startResizing(isResizingLeft)} />
        
        <div style={{ flex: 1, position: 'relative', zIndex: 0, overflow: 'hidden' }}>
        <MainContentWindow
          openFiles={openFiles}
          activeFile={activeFile}
          activeLine={activeLine}
          fileContents={fileContents}
          onTabClick={(path) => { setActiveFile(path); setActiveLine(null); }}
          onCloseTab={handleCloseFile}
          onUpdateFile={handleUpdateFileContent}
          onFileClick={handleFileClick}
          onSendMessage={handleSend}
          onAddMessage={(msg) => setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: msg, isStatus: true, isComplete: true }])}
        />
    </div>

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

