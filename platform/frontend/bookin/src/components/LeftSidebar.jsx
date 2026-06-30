import React, { useRef } from 'react'
import { BookOpen } from 'lucide-react'
import { SessionsList } from './SessionsList'
import { ProjectFilesList } from './ProjectFilesList'

export const LeftSidebar = React.memo(({ width, onFileClick, activeFile, sessions, setSessions, currentSession, onSelectSession, onResetSession }) => {
  const sidebarRef = useRef(null)

  return (
    <aside ref={sidebarRef} className="sidebar files-sidebar" style={{ width }}>
      <div className="sidebar-content">
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
      <div
        onClick={() => onFileClick('docs/index.md')}
        className="sidebar-docs-link"
      >
        <BookOpen size={14} />
        <span>Docs</span>
      </div>
    </aside>
  )
})

