import { useState, useEffect, useRef } from 'react';
import { fetchChatHistory } from '../utils/historyUtils';
import { setupWebSocket } from '../utils/wsUtils';

export const useChatManagement = (sessionId, handleOpenFilePreview, handleSilentFileUpdate, handleRequireApproval, token) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const handleOpenFilePreviewRef = useRef(handleOpenFilePreview);
  const handleSilentFileUpdateRef = useRef(handleSilentFileUpdate);
  const handleRequireApprovalRef = useRef(handleRequireApproval);

  useEffect(() => {
    handleOpenFilePreviewRef.current = handleOpenFilePreview;
    handleSilentFileUpdateRef.current = handleSilentFileUpdate;
    handleRequireApprovalRef.current = handleRequireApproval;
  }, [handleOpenFilePreview, handleSilentFileUpdate, handleRequireApproval]);

  useEffect(() => {
    if (!sessionId || !token) {
      setMessages([]);
      return;
    }
    const loadHistory = async () => {
      const history = await fetchChatHistory(sessionId, token);
      setMessages(history.length > 0 ? history : [{ id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' }]);
    };
    loadHistory();
  }, [sessionId, token]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, sessionId]);

  useEffect(() => {
    if (!sessionId || !token) {
      setIsConnecting(false);
      return;
    }
    let currentWs = null;
    let cancelled = false;
    let retryTimeout = null;
    let retryCount = 0;
    const BASE_DELAY_MS = 1000;
    const MAX_DELAY_MS = 3000; // Cap backoff at 3 seconds for fast recovery

    const triggerFastReconnect = () => {
      if (cancelled) return;
      if (!currentWs || currentWs.readyState === WebSocket.CLOSED || currentWs.readyState === WebSocket.CLOSING) {
        console.log('[WS] Fast-tracking reconnect due to event (user interaction / online / tab focus)');
        clearTimeout(retryTimeout);
        retryCount = 0;
        connect();
      }
    };

    // Fast-track reconnect if user clicks or presses a key while disconnected
    const handleUserInteraction = () => {
      triggerFastReconnect();
    };

    // Fast-track reconnect when returning to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerFastReconnect();
      }
    };

    window.addEventListener('pointerdown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('online', triggerFastReconnect);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const connect = async () => {
      if (cancelled) return;

      setIsConnecting(true);

      // HTTP Proxy Wake-up: Send a lightweight HTTP request to ensure the CodeSandbox
      // container & reverse proxy routes are active before attempting WebSocket handshake.
      try {
        await fetch('/health');
      } catch (_) {
        /* Ignore HTTP errors; sending packets wakes up the container route */
      }

      if (cancelled) return;

      const ws = setupWebSocket(
        sessionId,
        token,
        setMessages,
        setIsLoading,
        (data) => handleOpenFilePreviewRef.current(data),
        (data) => handleSilentFileUpdateRef.current(data),
        (data) => handleRequireApprovalRef.current(data)
      );
      currentWs = ws;
      setSocket(ws);

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        console.log('[WS] Connected');
        retryCount = 0; // reset backoff on successful connection

        // Small delay so the banner is visible even on fast local connections.
        setTimeout(() => {
          if (!cancelled) setIsConnecting(false);
        }, 600);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        try { ws.close(); } catch (_) { /* already closing */ }
      };

      ws.onclose = () => {
        if (cancelled) return;          // intentional close on unmount/session-switch
        if (ws !== currentWs) return;    // stale socket — a newer connect() already ran
        console.log('[WS] Disconnected — scheduling reconnect…');
        setIsLoading(false);             // clear any stuck loading spinner
        setIsConnecting(true);
        const delay = Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${retryCount + 1})`);
        retryCount++;
        retryTimeout = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('online', triggerFastReconnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (currentWs) currentWs.close();
    };
  }, [sessionId, token]);

  const handleSend = async (text, metadata = {}) => {
    if (text.trim() && socket && !isConnecting && !isLoading) {
      if (!metadata.silent) {
        setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: text }]);
      }
      setIsLoading(true);

      // Determine if we should send a JSON object for silent commands
      if (metadata.silent) {
        socket.send(JSON.stringify({
          type: 'internal-command',
          text: text
        }));
      } else {
        socket.send(text);
      }
    }
  };

  return { messages, isLoading, isConnecting, handleSend, setMessages, messagesEndRef };
};
