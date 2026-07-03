import { useState, useEffect, useRef } from 'react';
import { fetchChatHistory } from '../utils/historyUtils';
import { setupWebSocket } from '../utils/wsUtils';

export const useChatManagement = (sessionId, handleOpenFilePreview, handleRequireApproval) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const handleOpenFilePreviewRef = useRef(handleOpenFilePreview);
  const handleRequireApprovalRef = useRef(handleRequireApproval);

  useEffect(() => {
    handleOpenFilePreviewRef.current = handleOpenFilePreview;
    handleRequireApprovalRef.current = handleRequireApproval;
  }, [handleOpenFilePreview, handleRequireApproval]);
  useEffect(() => {
    const loadHistory = async () => {
      const history = await fetchChatHistory(sessionId);
      setMessages(history.length > 0 ? history : [{ id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' }]);
    };
    loadHistory();
  }, [sessionId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, sessionId]);

  useEffect(() => {
    const ws = setupWebSocket(
      sessionId,
      setMessages,
      setIsLoading,
      (data) => handleOpenFilePreviewRef.current(data),
      (data) => handleRequireApprovalRef.current(data)
    );
    setSocket(ws);
    return () => ws.close();
  }, [sessionId]);

  const handleSend = async (text, metadata = {}) => {
    if (text.trim() && socket) {
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

  return { messages, isLoading, handleSend, setMessages, messagesEndRef };
};

