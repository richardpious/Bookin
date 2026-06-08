export const setupWebSocket = (client_id, setMessages, setIsLoading) => {
  const ws = new WebSocket(`ws://localhost:8000/ws/${client_id}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: data.message }]);
    setIsLoading(false);
  };

  ws.onopen = () => console.log('WebSocket connected');
  ws.onclose = () => console.log('WebSocket disconnected');

  return ws;
};
