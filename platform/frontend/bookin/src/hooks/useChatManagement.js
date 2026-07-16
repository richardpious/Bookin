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
    const MAX_DELAY_MS = 30_000;

    const connect = () => {
      if (cancelled) return;

      setIsConnecting(true);

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
        console.log('WebSocket connected');
        retryCount = 0; // reset backoff on successful connection
        // Small delay so the banner is visible even on fast local connections.
        setTimeout(() => {
          if (!cancelled) setIsConnecting(false);
        }, 600);
      };

      ws.onclose = () => {
        if (cancelled) return; // intentional close on unmount/session-switch — don't reconnect
        console.log('WebSocket disconnected — scheduling reconnect…');
        setIsLoading(false); // clear any stuck loading spinner
        setIsConnecting(true);
        const delay = Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS);
        console.log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1})`);
        retryCount++;
        retryTimeout = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;            // prevent any pending reconnect from firing
      clearTimeout(retryTimeout);  // cancel a scheduled retry if one is queued
      if (currentWs) currentWs.close();
    };
  }, [sessionId, token]);

  const handleSend = async (text, metadata = {}) => {
    if (text.trim() && socket && !isConnecting) {
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

