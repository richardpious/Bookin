import React, { useEffect, useState, useRef } from 'react'
import { MessageSquare, Plus } from 'lucide-react'

const SessionItem = React.memo(({ session, isSelected, onSelect, onReset }) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close menu if clicking outside
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
    }
  }
    // Close confirm modal if clicking on the overlay
    const handleOverlayClick = (event) => {
      if (event.target.classList.contains('confirm-overlay')) {
        setShowConfirm(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('mousedown', handleOverlayClick)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('mousedown', handleOverlayClick)
    }
  }, [])

  return (
    <div
      ref={menuRef}
      onClick={() => onSelect(session)}
      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = '#2a2a2a';
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
      className="file-item"
      style={{
        backgroundColor: isSelected ? '#252525' : 'transparent',
        color: isSelected ? 'white' : 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        margin: '0',
        height: '32px',
        boxSizing: 'border-box',
        borderRadius: '4px',
        position: isSelected ? 'sticky' : 'relative',
        top: isSelected ? '48px' : 'auto',
        zIndex: isSelected ? 20 : 'auto',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
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
          right: '0',
          top: '25px',
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-light)',
          borderRadius: '4px',
          zIndex: 1000,
          padding: '4px 0',
          minWidth: '120px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <div
            onClick={(e) => { e.stopPropagation(); onReset(session, true); setShowMenu(false); }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#252525'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Reset Session
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); setShowMenu(false); }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#252525'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Delete Session
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          className="confirm-overlay"
          style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-sidebar)',
            padding: '20px',
            borderRadius: '8px',
                border: '1px solid var(--border-light)',
            color: 'white'
          }}>
            <p>Are you sure you want to delete session "{session}"?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <button onClick={() => { setShowConfirm(false); onReset(session, false); }} style={{ backgroundColor: '#cc0000', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Delete</button>
            </div>
          </div>
      </div>
      )}
      </div>
  )
})

const SessionHeader = React.memo(({ onAddClick }) => (
  <div className="sidebar-header" style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--bg-sidebar)',
    padding: '0.75rem 0 0.5rem 0',
    height: '48px',
    boxSizing: 'border-box',
    zIndex: 25
  }}>
    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Sessions</h2>
    <Plus
      size={20}
      style={{ cursor: 'pointer', color: '#8e8ea0' }}
      onClick={onAddClick}
    />
  </div>
))

export const SessionsList = React.memo(({ sessions, setSessions, currentSession, onSelectSession, onResetSession, sidebarRef }) => {
  const [isCreating, setIsCreating] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')

  useEffect(() => {
    // Close sidebar elements when clicking outside
    const handleClickOutside = (event) => {
      if (sidebarRef && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setIsCreating(false)
    }
  }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarRef])

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

  return (
    <>
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

      <>
        {sessions.map((session) => (
          <SessionItem
            key={session}
            session={session}
            isSelected={currentSession === session}
            onSelect={onSelectSession}
            onReset={onResetSession}
          />
        ))}
      </>
    </>
  )
})

