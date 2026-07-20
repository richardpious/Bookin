export const fetchChatHistory = async (sessionId, token) => {
  try {
    const response = await fetch(`/history/${sessionId}?t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch chat history');
    }
    const data = await response.json();
    // Convert backend format to frontend format
    return data.history.map((msg, index) => {
      if (msg.sender === 'tool') {
        try {
          const parsed = JSON.parse(msg.message);
          return {
            id: `history-tool-${index}`,
            toolCallId: parsed.toolCallId,
            sender: 'agent',
            isStatus: true,
            isComplete: true,
            toolName: parsed.title || parsed.name,
            toolParams: parsed.meta || {},
            text: `Using tool: ${parsed.title || parsed.name}`
          };
        } catch (e) {
          return null;
        }
      }

      const isError = msg.sender === 'agent' && msg.message.startsWith('[Error] ');
      return {
        id: index,
        sender: msg.sender === 'agent' ? 'bot' : 'user',
        text: msg.message,
        isComplete: true,
        ...(isError && { isError: true }),
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
};

