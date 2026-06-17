import { useState, useEffect, useRef } from 'react';
import { fetchChatHistory } from '../utils/historyUtils';
import { setupWebSocket } from '../utils/wsUtils';

export const useChatManagement = (sessionId, handleOpenSimPreview, handleRequireApproval) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const handleOpenSimPreviewRef = useRef(handleOpenSimPreview);
  const handleRequireApprovalRef = useRef(handleRequireApproval);

  useEffect(() => {
    handleOpenSimPreviewRef.current = handleOpenSimPreview;
    handleRequireApprovalRef.current = handleRequireApproval;
  }, [handleOpenSimPreview, handleRequireApproval]);
  useEffect(() => {
    const loadHistory = async () => {
      const history = await fetchChatHistory(sessionId);
      setMessages(history.length > 0 ? history : [{ id: 1, sender: 'bot', text: 'Hello! How can I help you with Booksim today?' }]);
    };
    loadHistory();
  }, [sessionId]);

  useEffect(() => {
    const ws = setupWebSocket(
      sessionId,
      setMessages,
      setIsLoading,
      (data) => handleOpenSimPreviewRef.current(data),
      (data) => handleRequireApprovalRef.current(data)
    );
    setSocket(ws);
    return () => ws.close();
  }, [sessionId]);

  const handleSend = async (text) => {
    if (text.trim() && socket) {
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: text }]);
      setIsLoading(true);
      socket.send(text);
    }
  };

  return { messages, isLoading, handleSend, setMessages, messagesEndRef };
};

