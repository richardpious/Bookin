import { useState, useEffect, useCallback } from 'react';

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

export function useSessionManagement(token) {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('activeSessionId') || null;
  });

  // Sync sessionId to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('activeSessionId', sessionId);
    } else {
      localStorage.removeItem('activeSessionId');
    }
  }, [sessionId]);

  // Load initial sessions
  useEffect(() => {
    if (!token) return;
    const loadSessions = async () => {
      const data = await fetchSessions(token);
      setSessions(data);
      setSessionsLoaded(true);
      
      if (data && data.length > 0) {
        if (!data.some(s => s.id === sessionId)) {
          setSessionId(data[0].id);
        }
      } else {
        setSessionId(null);
      }
    };
    loadSessions();
  }, [token]);

  const createSession = useCallback(async (title) => {
    if (!token) return null;
    try {
      const response = await fetch('/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      if (!response.ok) throw new Error('Failed to create session');
      const newSession = await response.json();
      setSessions(prev => [newSession, ...prev]);
      setSessionId(newSession.id);
      return newSession;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [token]);

  const deleteSession = useCallback(async (session, shouldReopen = false, onResetSuccess = null) => {
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

      if (shouldReopen && !newSessions.some(s => s.id === session)) {
          // If reopen is true but it's not in the new list, it was deleted, so we should keep our optimistic UI state?
          // Actually, if we reset it, we probably want to fetch again. But delete session for reset just clears messages.
          // Wait, the API for reset actually calls `delete_session` which deletes the session from the database.
          // If the database deletes the session, the session ID is gone. We shouldn't put it back if we use UUIDs.
          // Actually, if it's a reset, it shouldn't have been deleted from `sessions` table.
          // In `session_routes.py`, `delete_session` calls `chat_db.delete_session(session_id)`.
          // If we want to keep it, we need to create a new session with the same title.
          // For now, let's just do what it was doing, but with objects.
          // However, we don't have the title easily here unless we look it up.
          // It's safer to just let the new sessions list update it.
      }
      setSessions(newSessions);

      if (sessionId === session) {
        if (shouldReopen) {
          if (onResetSuccess) {
            onResetSuccess();
          }
        } else {
          const nextSession = newSessions.length > 0 ? newSessions[0].id : null;
          setSessionId(nextSession);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting session: ${err.message}`);
    }
  }, [sessionId, token]);

  return {
    sessions,
    sessionsLoaded,
    setSessions,
    sessionId,
    setSessionId,
    deleteSession,
    createSession
  };
}
