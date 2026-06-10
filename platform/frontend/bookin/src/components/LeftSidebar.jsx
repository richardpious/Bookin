import { useEffect, useState } from 'react'
import { Folder, FileText, ChevronRight, ChevronDown, MessageSquare, Plus } from 'lucide-react'
import { fetchFiles } from '../utils/fileUtils'

const FileNode = ({ name, path, isDir, onFileClick, activeFile }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(false)
  const isActive = path === activeFile

  const handleClick = async (e) => {
    e.stopPropagation();
    if (isDir) {
      if (!isOpen) {
        setLoading(true)
        try {
          const fetchedFiles = await fetchFiles(path)
          setChildren(fetchedFiles)
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      setIsOpen(!isOpen)
    } else {
      onFileClick(path)
    }
  }

  return (
    <div>
      <div 
        className={`file-item ${isActive ? 'active' : ''}`}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px',
          cursor: 'pointer',
          backgroundColor: isActive ? '#323232' : 'transparent',
          color: isActive ? '#ffffff' : 'inherit'
        }}
      >
        {isDir && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        {!isDir && <div style={{width: 16}} />}
        {isDir ? <Folder size={16} /> : <FileText size={16} />}
        <span>{name}</span>
      </div>
      {isOpen && isDir && (
        <div style={{ marginLeft: '20px' }}>
          {children.map((child) => (
            <FileNode key={child.path} {...child} onFileClick={onFileClick} activeFile={activeFile} />
          ))}
        </div>
      )}
    </div>
  )
}

const SessionItem = ({ session, isSelected, onSelect, onReset }) => {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div
      onClick={() => onSelect(session)}
      className="file-item"
      style={{
        backgroundColor: isSelected ? '#252525' : 'transparent',
        color: isSelected ? 'white' : 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={16} />
        <span>{session}</span>
      </div>
      <span
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        style={{ cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}
      >
        ...
      </span>

      {showMenu && (
        <div style={{
          position: 'absolute',
          right: '-100px',
          top: '100%',
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-light)',
          borderRadius: '4px',
          zIndex: 10,
          padding: '4px 0',
          minWidth: '100px'
        }}>
          <div
            onClick={(e) => { e.stopPropagation(); onReset(session); setShowMenu(false); }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#252525'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Reset Session
          </div>
        </div>
      )}
    </div>
  )
}

const SessionHeader = ({ onAddClick }) => (
  <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <h2>Sessions</h2>
    <Plus
      size={18}
      style={{ cursor: 'pointer', color: '#8e8ea0' }}
      onClick={onAddClick}
          />
      </div>
  )

export const LeftSidebar = ({ width, onFileClick, activeFile, sessions, setSessions, currentSession, onSelectSession }) => {
  const [files, setFiles] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')

  useEffect(() => {
    fetchFiles()
      .then(setFiles)
      .catch(err => console.error(err))
  }, [])

  const handleCreateSession = (e) => {
    e.preventDefault()
    if (newSessionName.trim()) {
      const name = newSessionName.trim()
      onSelectSession(name)
      // Add to list immediately if not already there
      if (!sessions.includes(name)) {
        setSessions(prev => [name, ...prev])
      }
      setNewSessionName('')
      setIsCreating(false)
    }
  }

  const handleResetSession = async (session) => {
    try {
      const response = await fetch(`http://localhost:8000/reset_session/${session}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to reset session');
      // If successful, maybe alert or refresh
      alert(`Session ${session} reset successfully`);
    } catch (err) {
      console.error(err);
      alert('Error resetting session');
    }
  }

  return (
    <aside className="sidebar files-sidebar" style={{
      width,
      height: '100vh',
      overflowY: 'auto'
    }}>
      <SessionHeader onAddClick={() => setIsCreating(!isCreating)} />

      {isCreating && (
        <form onSubmit={handleCreateSession} style={{ marginBottom: '1rem' }}>
          <input
            autoFocus
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="New session name..."
            style={{
                width: '100%',
                padding: '0.5rem',
                boxSizing: 'border-box',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-light)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '0.875rem'
            }}
          />
        </form>
      )}

      <div style={{ marginBottom: '2rem' }}>
        {sessions.map((session) => (
          <SessionItem
            key={session}
            session={session}
            isSelected={currentSession === session}
            onSelect={onSelectSession}
            onReset={handleResetSession}
          />
        ))}
      </div>

      <div className="project-section">
        <h3>Project Files</h3>
        {files.map((file) => (
          <FileNode key={file.path} {...file} onFileClick={onFileClick} activeFile={activeFile} />
        ))}
      </div>
    </aside>
  )
}

