import React, { useRef } from 'react'
import { BookOpen } from 'lucide-react'
import { SessionsList } from './SessionsList'
import { ProjectFilesList } from './ProjectFilesList'

export const LeftSidebar = React.memo(({ width, onFileClick, activeFile, sessions, setSessions, currentSession, onSelectSession, onResetSession }) => {
  const sidebarRef = useRef(null)

  return (
    <aside ref={sidebarRef} className="sidebar files-sidebar" style={{
      width,
      height: '100%',
            display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 10,
      padding: '0px'
    }}>
      <div style={{ flex: 1, overflowY: 'auto', leftPadding: '0.5rem' }}>
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
        style={{
            padding: '12px 24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem'
        }}
        onMouseOver={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)';
        }}
      >
        <BookOpen size={14} />
        <span>Docs</span>
      </div>
    </aside>
  )
})

