import React, { useRef } from 'react'
import { SessionsList } from './SessionsList'
import { ProjectFilesList } from './ProjectFilesList'

export const LeftSidebar = React.memo(({ width, onFileClick, activeFile, sessions, setSessions, currentSession, onSelectSession, onResetSession }) => {
  const sidebarRef = useRef(null)

  return (
    <aside ref={sidebarRef} className="sidebar files-sidebar" style={{
      width,
      height: '100vh',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 10,
      padding: '0px'
    }}>
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
    </aside>
  )
})
