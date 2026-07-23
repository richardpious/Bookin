import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { Header } from './components/Header'
import { Resizer } from './components/Resizer'
import { ChatSidebar } from './components/ChatSidebar'
import { LeftSidebar } from './components/LeftSidebar'
import { MainContentWindow } from './components/MainContentWindow'
import { AuthScreen } from './components/AuthScreen'
import ApprovalModal from './components/ApprovalModal'
const SearchResultsPanel = lazy(() => import('./components/SearchResultsPanel'))
import { useResizer } from './hooks/useResizer'
import { useFileManagement } from './hooks/useFileManagement'
import { useChatManagement } from './hooks/useChatManagement'
import { useSessionManagement } from './hooks/useSessionManagement'
import { useAgentSettings } from './hooks/useAgentSettings'
import './App.css'
import './index.css'

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

  const { sessions, setSessions, sessionId, setSessionId, deleteSession } = useSessionManagement(token);

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
  const { openFiles, activeFile, fileContents, dirtyFiles, hasUnreadLogs, clearUnreadLogs, handleFileClick, handleOpenFilePreview, handleSilentFileUpdate, handleCloseFile, handleUpdateFileContent, handleEditContent, setActiveFile } = useFileManagement();

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

  const { handleModelChange, handleThinkingLevelChange } = useAgentSettings(token, username, sessionId);

  const handleDeleteSession = useCallback(async (session, shouldReopen = false) => {
    await deleteSession(session, shouldReopen, () => {
      setMessages([{ id: 1, sender: 'bot', text: 'Session reset successfully. How can I help you?' }]);
    });
  }, [deleteSession, setMessages]);

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
        <Suspense fallback={null}>
        <SearchResultsPanel
          results={searchResults}
          query={searchQuery}
          onOpenFile={handleOpenFileFromSearch}
          onClose={() => setSearchResults(null)}
        />
        </Suspense>
      )}
      <div className="main-layout">
        <LeftSidebar
            width={leftWidth}
            onFileClick={handleFileClick}
            activeFile={activeFile}
            sessions={sessions}
            setSessions={setSessions}
            currentSession={sessionId}
            onSelectSession={setSessionId}
            onResetSession={handleDeleteSession}
            username={username}
            hasUnreadLogs={hasUnreadLogs}
            onClearUnreadLogs={clearUnreadLogs}
        />
        <Resizer onMouseDown={() => startResizing(isResizingLeft)} />
        
        <div className="main-content-window-wrapper">
        <MainContentWindow
          openFiles={openFiles}
          activeFile={activeFile}
          activeLine={activeLine}
          fileContents={fileContents}
          dirtyFiles={dirtyFiles}
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
          sessionId={sessionId}
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

