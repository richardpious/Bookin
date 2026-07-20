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
      
      if (data && data.length > 0) {
        if (!data.includes(sessionId)) {
          setSessionId(data[0]);
        }
      } else {
        setSessionId(null);
      }
    };
    loadSessions();
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

      if (shouldReopen && !newSessions.includes(session)) {
          setSessions([session, ...newSessions]);
      } else {
          setSessions(newSessions);
      }

      if (sessionId === session) {
        if (shouldReopen) {
          if (onResetSuccess) {
            onResetSuccess();
          }
        } else {
          const nextSession = newSessions.length > 0 ? newSessions[0] : null;
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
    setSessions,
    sessionId,
    setSessionId,
    deleteSession
  };
}
