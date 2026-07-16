import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Header } from './components/Header'
import { Resizer } from './components/Resizer'
import { ChatSidebar } from './components/ChatSidebar'
import { LeftSidebar } from './components/LeftSidebar'
import { MainContentWindow } from './components/MainContentWindow'
import { AuthScreen } from './components/AuthScreen'
import ApprovalModal from './components/ApprovalModal'
import SearchResultsPanel from './components/SearchResultsPanel'
import { useResizer } from './hooks/useResizer'
import { useFileManagement } from './hooks/useFileManagement'
import { useChatManagement } from './hooks/useChatManagement'
import './App.css'
import './index.css'

async function fetchSessions(token) {
  try {
    const response = await fetch('/sessions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));

  const handleLogin = (newToken, newUsername) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
  };

  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('activeSessionId') || 'default';
  });
  
  useEffect(() => {
    localStorage.setItem('activeSessionId', sessionId);
  }, [sessionId]);
  const [sessions, setSessions] = useState([])
  const [approvalRequest, setApprovalRequest] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLine, setActiveLine] = useState(null)
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const { leftWidth, rightWidth, isResizingLeft, isResizingRight, startResizing } = useResizer();
  const { openFiles, activeFile, fileContents, savedFileContents, handleFileClick, handleOpenFilePreview, handleSilentFileUpdate, handleCloseFile, handleUpdateFileContent, handleEditContent, setActiveFile } = useFileManagement();

  const handleRequireApproval = useCallback((data) => {
    setApprovalRequest(data);
  }, []);
  const { messages, isLoading, isConnecting, handleSend, setMessages, messagesEndRef } = useChatManagement(
    sessionId,
    handleOpenFilePreview,
    handleSilentFileUpdate,
    handleRequireApproval,
    token
  );

  const handleModelChange = useCallback(async (modelId) => {
    console.log("Model changed to:", modelId);

    try {
      const response = await fetch('/set-model', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const response = await fetch('/set-thinking-level', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
    if (!token) return;
    const loadSessions = async () => {
      const data = await fetchSessions(token)
      setSessions(data)
      
      if (data && data.length > 0) {
        // If the current sessionId doesn't belong to this user's sessions,
        // automatically select their most recent session.
        if (!data.some(s => s.id === sessionId)) {
          setSessionId(data[0].id);
        }
      } else {
        // If the user has no sessions, generate a fresh session ID
        // so it doesn't conflict with any leftover IDs in localStorage.
        setSessionId(uuidv4());
      }
    }
    loadSessions()
  }, [token])

  const handleDeleteSession = useCallback(async (session, shouldReopen = false) => {
    try {
      const response = await fetch(`/delete_session/${session}`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let responseData = {};
      try {
        responseData = await response.json();
      } catch (e) {
        // ignore JSON parse error
      }

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || responseData.message || 'Failed to delete session');
      }

      const newSessions = await fetchSessions(token);
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
          // If we deleted the current session, switch to a default or clear messages
          const nextSession = newSessions.length > 0 ? newSessions[0] : 'default';
          setSessionId(nextSession);
          // If we have sessions, load the first one, otherwise show default message
          if (newSessions.length > 0) {
              // This is a bit simplified, ideally we'd trigger a fetch for the new session's messages
              // But let's just clear for now if we can't easily fetch
              setMessages([{ id: 1, sender: 'bot', text: `Switched to session: ${nextSession}` }]);
          } else {
            setMessages([{ id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' }]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting session: ${err.message}`);
    }
  }, [sessionId, setMessages, setSessionId]);
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

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Header
        onModelChange={handleModelChange}
        onThinkingLevelChange={handleThinkingLevelChange}
        sessionId={sessionId}
        onSearch={handleSearch}
        username={username}
        onLogout={handleLogout}
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
          savedFileContents={savedFileContents}
          onTabClick={(path) => { setActiveFile(path); setActiveLine(null); }}
          onCloseTab={handleCloseFile}
          onUpdateFile={handleUpdateFileContent}
          onEditContent={handleEditContent}
          onFileClick={handleFileClick}
          onSendMessage={handleSend}
          onToast={showToast}
          onAddMessage={(msg) => {
            // Update sender to 'agent' to match CSS and DB conventions
            setMessages((prev) => [...prev, { id: Date.now(), sender: 'agent', text: msg, isStatus: true, isComplete: true }]);
            // Persist as 'agent'
            fetch('/log-message', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ sessionId, sender: 'agent', text: msg })
            }).catch(console.error);
          }}
        />
    </div>

        <Resizer onMouseDown={() => startResizing(isResizingRight)} />

        <ChatSidebar
          width={rightWidth}
          messages={messages}
          isLoading={isLoading}
          isConnecting={isConnecting}
          onSend={handleSend}
          messagesEndRef={messagesEndRef}
        />
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toastType === 'error' ? 'toast-error' : ''}`}>
              {toast}
            </div>
          </div>
        )}
    </div>
    </div>
  )
}

export default App

