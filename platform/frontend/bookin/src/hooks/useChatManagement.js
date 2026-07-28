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
    let pingInterval = null;
    let pongTimeoutId = null;
    let retryCount = 0;
    const BASE_DELAY_MS = 1000;
    const MAX_DELAY_MS = 30_000;
    const PING_INTERVAL_MS = 25_000; // 25s — under most proxy idle thresholds
    const PONG_TIMEOUT_MS = 10_000;  // 10s to receive pong before declaring dead

    // --- Visibility-change handler ---
    // When the user returns to a backgrounded tab (common with CodeSandbox),
    // the VM may have hibernated and killed all sockets. Detect this and
    // fast-track a reconnect instead of waiting for the next backoff timer.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || cancelled) return;

      if (!currentWs || currentWs.readyState === WebSocket.CLOSED || currentWs.readyState === WebSocket.CLOSING) {
        // Socket is already dead — skip any pending backoff and reconnect now
        console.log('[WS] Tab visible with dead socket — fast-tracking reconnect');
        clearTimeout(retryTimeout);
        clearInterval(pingInterval);
        clearTimeout(pongTimeoutId);
        retryCount = 0;
        connect();
      } else if (currentWs.readyState === WebSocket.OPEN) {
        // Socket *appears* open — send a probe ping to verify.
        // If the connection is half-dead the pong timeout will close it.
        try {
          currentWs.send(JSON.stringify({ type: 'ping' }));
          clearTimeout(pongTimeoutId);
          pongTimeoutId = setTimeout(() => {
            console.warn('[WS] Post-wake pong timeout — forcing close');
            if (currentWs) currentWs.close();
          }, PONG_TIMEOUT_MS);
        } catch (e) {
          console.error('[WS] Failed to send wake ping:', e);
          if (currentWs) currentWs.close();
        }
      }
      // If CONNECTING, let the normal flow handle it
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const connect = () => {
      if (cancelled) return;

      setIsConnecting(true);

      // Pong callback: clears the dead-man timeout whenever the server replies
      const onPong = () => {
        clearTimeout(pongTimeoutId);
      };

      const ws = setupWebSocket(
        sessionId,
        token,
        setMessages,
        setIsLoading,
        (data) => handleOpenFilePreviewRef.current(data),
        (data) => handleSilentFileUpdateRef.current(data),
        (data) => handleRequireApprovalRef.current(data),
        onPong
      );
      currentWs = ws;
      setSocket(ws);

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        console.log('[WS] Connected');
        retryCount = 0; // reset backoff on successful connection

        // Application-level keep-alive: send a lightweight ping every 25s.
        // This produces real data-frame traffic that cloud reverse proxies
        // (CodeSandbox, Cloudflare, etc.) count as activity.
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
            // Dead-man switch: if no pong arrives within 10s, the connection
            // is half-dead (common after CodeSandbox VM hibernate). Force close
            // so the onclose handler can reconnect cleanly.
            clearTimeout(pongTimeoutId);
            pongTimeoutId = setTimeout(() => {
              console.warn('[WS] Pong timeout — forcing socket close');
              ws.close();
            }, PONG_TIMEOUT_MS);
          }
        }, PING_INTERVAL_MS);

        // Small delay so the banner is visible even on fast local connections.
        setTimeout(() => {
          if (!cancelled) setIsConnecting(false);
        }, 600);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        // The browser fires onclose after onerror in most cases, but if it
        // doesn't we force-close to guarantee the reconnect path runs.
        try { ws.close(); } catch (_) { /* already closing */ }
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        clearTimeout(pongTimeoutId);
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
      cancelled = true;                                      // prevent any pending reconnect
      clearTimeout(retryTimeout);                            // cancel a scheduled retry
      clearInterval(pingInterval);                           // stop keep-alive pings
      clearTimeout(pongTimeoutId);                           // cancel pong dead-man switch
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

