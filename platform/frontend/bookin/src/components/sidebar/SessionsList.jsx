import React, { useEffect, useState, useRef } from 'react'
import { MessageSquare, Plus, PanelLeftClose } from 'lucide-react'
import './SessionsList.css'

const SessionItem = React.memo(({ session, isSelected, onSelect, onReset }) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const menuRef = useRef(null)

  const handleCloseConfirm = (setter) => {
    setIsClosing(true)
    setTimeout(() => {
      setter(false)
      setIsClosing(false)
    }, 200)
  }

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
        if (showConfirm) handleCloseConfirm(setShowConfirm)
        if (showResetConfirm) handleCloseConfirm(setShowResetConfirm)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('mousedown', handleOverlayClick)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('mousedown', handleOverlayClick)
    }
  }, [showConfirm, showResetConfirm])

  return (
    <div
      ref={menuRef}
      onClick={() => onSelect(session.id)}
      className={`session-item ${isSelected ? 'active' : ''}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={16} />
        <span>{session.title || session.id}</span>
      </div>
      <span
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="session-menu-trigger"
      >
        ...
      </span>

      {showMenu && (
        <div className="session-menu">
          <div
            onClick={(e) => { e.stopPropagation(); setShowResetConfirm(true); setShowMenu(false); }}
            className="session-menu-item"
          >
            Reset Session
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); setShowMenu(false); }}
            className="session-menu-item"
          >
            Delete Session
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div
          className={`confirm-overlay ${isClosing ? 'fade-out' : ''}`}
        >
          <div className="confirm-modal">
            <p>Are you sure you want to reset session "{session.title || session.id}"?</p>
            <div className="confirm-actions">
              <button onClick={() => handleCloseConfirm(setShowResetConfirm)}>Cancel</button>
              <button onClick={() => { handleCloseConfirm(setShowResetConfirm); onReset(session.id, true); }} className="confirm-btn-delete">Reset</button>
            </div>
          </div>
      </div>
      )}

      {showConfirm && (
        <div
          className={`confirm-overlay ${isClosing ? 'fade-out' : ''}`}
        >
          <div className="confirm-modal">
            <p>Are you sure you want to delete session "{session.title || session.id}"?</p>
            <div className="confirm-actions">
              <button onClick={() => handleCloseConfirm(setShowConfirm)}>Cancel</button>
              <button onClick={() => { handleCloseConfirm(setShowConfirm); onReset(session.id, false); }} className="confirm-btn-delete">Delete</button>
            </div>
          </div>
      </div>
      )}
      </div>
  )
})

const SessionHeader = React.memo(({ onAddClick, onToggleCollapse }) => (
  <div className="session-header">
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        title="Collapse sidebar"
      >
        <PanelLeftClose size={16} />
      </button>
      <h2>Sessions</h2>
    </div>
    <Plus
      size={20}
      className="session-add-icon"
      onClick={onAddClick}
    />
  </div>
))

export const SessionsList = React.memo(({ sessions, sessionsLoaded, setSessions, currentSession, onSelectSession, onResetSession, sidebarRef, createSession, onToggleCollapse }) => {
  const isEmpty = !sessions || sessions.length === 0
  const [isCreating, setIsCreating] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')

  // Auto-expand the creation form only after sessions have loaded and are confirmed empty
  useEffect(() => {
    if (sessionsLoaded && isEmpty) setIsCreating(true)
  }, [sessionsLoaded, isEmpty])

  useEffect(() => {
    // Close sidebar elements when clicking outside (only if there are sessions to fall back to)
    const handleClickOutside = (event) => {
      if (!isEmpty && sidebarRef && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setIsCreating(false)
    }
  }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarRef, isEmpty])

  const handleCreateSession = async (e) => {
    e.preventDefault()
    if (newSessionName.trim()) {
      const name = newSessionName.trim()
      await createSession(name)
      setNewSessionName('')
      setIsCreating(false)
    }
  }

  return (
    <>
      <SessionHeader onAddClick={() => setIsCreating(!isCreating)} onToggleCollapse={onToggleCollapse} />

      {isCreating && (
        <form onSubmit={handleCreateSession} className="new-session-form">
          <input
            autoFocus
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="New session name..."
            className="session-input"
          />
          {isEmpty && (
            <span style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              padding: '6px 8px',
              opacity: 0.85
            }}>
              Name your first session to get started
            </span>
          )}
        </form>
      )}

      <>
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isSelected={currentSession === session.id}
            onSelect={onSelectSession}
            onReset={onResetSession}
          />
        ))}
      </>
    </>
  )
})

