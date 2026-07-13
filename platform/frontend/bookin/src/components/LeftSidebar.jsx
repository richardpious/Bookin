import React, { useRef } from 'react'
import { BookOpen, Activity } from 'lucide-react'
import { SessionsList } from './SessionsList'
import { ProjectFilesList } from './ProjectFilesList'

export const LeftSidebar = React.memo(({ width, onFileClick, activeFile, sessions, setSessions, currentSession, onSelectSession, onResetSession, connectionStatus }) => {
  const sidebarRef = useRef(null)

  return (
    <aside ref={sidebarRef} className="sidebar files-sidebar" style={{ width, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SessionsList
          sessions={sessions}
          setSessions={setSessions}
          currentSession={currentSession}
          onSelectSession={onSelectSession}
          onResetSession={onResetSession}
          sidebarRef={sidebarRef}
        />
        <ProjectFilesList
          onFileClick={onFileClick}
          activeFile={activeFile}
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
          onClick={() => onFileClick('logs-viewer:' + currentSession)}
          className="sidebar-docs-link"
          style={{ flex: 1, borderTop: 'none' }}
        >
          <Activity size={14} />
          <div>Logs</div>
        </div>
      </div>
    </aside>
  )
})

