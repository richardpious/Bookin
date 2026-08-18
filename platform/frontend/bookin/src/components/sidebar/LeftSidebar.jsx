import React, { useRef } from 'react'
import { BookOpen, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { SessionsList } from './SessionsList'
import { ProjectFilesList } from './ProjectFilesList'
import './LeftSidebar.css'

export const LeftSidebar = React.memo(({ width, onFileClick, activeFile, sessions, sessionsLoaded, setSessions, currentSession, onSelectSession, onResetSession, connectionStatus, username, hasUnreadLogs, onClearUnreadLogs, createSession, collapsed, onToggleCollapse, onSearch, onError }) => {
  const sidebarRef = useRef(null)

  if (collapsed) {
    return (
      <aside className="sidebar files-sidebar sidebar-collapsed" style={{ width: 44 }}>
        <button
          className="sidebar-collapse-btn sidebar-expand-btn-left"
          onClick={onToggleCollapse}
          title="Expand sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    )
  }

  return (
    <aside ref={sidebarRef} className="sidebar files-sidebar" style={{ width: 'var(--left-sidebar-width)' }}>
      <div className="sidebar-content">
        <SessionsList
          sessions={sessions}
          sessionsLoaded={sessionsLoaded}
          setSessions={setSessions}
          currentSession={currentSession}
          onSelectSession={onSelectSession}
          onResetSession={onResetSession}
          sidebarRef={sidebarRef}
          createSession={createSession}
          onToggleCollapse={onToggleCollapse}
        />
        <ProjectFilesList
          onFileClick={onFileClick}
          activeFile={activeFile}
          currentSession={sessions?.find(s => s.id === currentSession)?.title || currentSession}
          username={username}
          onSearch={onSearch}
          onError={onError}
        />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--border-light)' }}>
        <div
          onClick={() => onFileClick('docs/index.md')}
          className="sidebar-docs-link"
          style={{ flex: 1, borderRight: '1px solid var(--border-light)', borderTop: 'none' }}
        >
          <BookOpen size={14} />
          <div>Docs</div>
        </div>
        <div
          onClick={() => {
            const sessionTitle = sessions?.find(s => s.id === currentSession)?.title || currentSession;
            onFileClick('logs-viewer:' + username + '/' + sessionTitle);
            if (onClearUnreadLogs) onClearUnreadLogs();
          }}
          className={`sidebar-docs-link ${hasUnreadLogs ? 'logs-button-highlight' : ''}`}
          style={{ flex: 1, borderTop: 'none', position: 'relative' }}
          title={hasUnreadLogs ? "New logs generated!" : "View Logs"}
        >
          <Activity size={14} className={hasUnreadLogs ? 'pulse-icon' : ''} />
          <div>Logs</div>
          {hasUnreadLogs && <span className="unread-log-badge" />}
        </div>
      </div>
    </aside>
  )
})
