export const setupWebSocket = (client_id, setMessages, setIsLoading, onFilePreview, onFileSilentUpdate, onRequireApproval) => {
  const ws = new WebSocket(`ws://localhost:8000/ws/${client_id}`);

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("Non-JSON message received:", event.data);
      return;
    }
    console.log("WebSocket message received:", data);

    if (data.type === 'gateway_log') {
      console.group("OpenClaw Gateway Event");
      console.table(data.payload);

      if (data.payload?.type === 'event' && data.payload?.event === 'plugin.approval.requested') {
        const approvalData = data.payload.payload;
        onRequireApproval({
          title: approvalData.request.title,
          description: approvalData.request.description,
          id: approvalData.id
        });
      }

      console.groupEnd();
      return;
    }

    if (data.type === 'command' && data.action === 'reset') {
      console.log("Reset command received");
      setMessages([]); // Assuming you want to clear the chat UI
      setIsLoading(false);
      return;
    }
    if (data.type === 'requireApproval') {
      onRequireApproval(data.data);
    } else if (data.type === 'file-changed') {
        const fullPath = data.path;
        console.log("File changed, silently updating:", fullPath);
        onFileSilentUpdate(fullPath);
    } else if (data.type === 'file-preview') {
      onFilePreview(data.data); // data.data is now the file path string
    } else if (data.type === 'chunk') {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        // Only append to the last message if it's not a status message.
        // We can identify status messages by a flag or just by content.
        // Let's add an 'isStatus' flag to our status messages.
        if (lastMessage && lastMessage.sender === 'bot' && !lastMessage.isComplete && !lastMessage.isStatus) {
          const updated = { ...lastMessage, text: lastMessage.text + data.message };
          if (data.reasoning !== undefined) {
            updated.reasoning = (lastMessage.reasoning || '') + data.reasoning;
          }
          return [...prev.slice(0, -1), updated];
        } else {
          const msg = { id: Date.now(), sender: 'bot', text: data.message, isComplete: false };
          if (data.reasoning !== undefined) {
            msg.reasoning = data.reasoning;
          }
          return [...prev, msg];
        }
      });
    } else if (data.type === 'done') {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.sender === 'bot') {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, isComplete: true }
          ];
        }
        return prev;
      });
      setIsLoading(false);
    } else if (data.type === 'error') {
      console.error("Agent Error:", data.message);
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: `Error: ${data.message}`, isComplete: true }]);
      setIsLoading(false);
    } else if (data.message) {
        // Fallback for legacy format
        setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: data.message, isComplete: true }]);
        setIsLoading(false);
    }
  };

  ws.onopen = () => console.log('WebSocket connected');
  ws.onclose = () => console.log('WebSocket disconnected');

  return ws;
};

