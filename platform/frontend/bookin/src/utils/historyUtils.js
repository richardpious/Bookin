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
          const toolResult = 
            parsed.result !== undefined && parsed.result !== null ? parsed.result :
            parsed.output !== undefined && parsed.output !== null ? parsed.output :
            parsed.progressText !== undefined && parsed.progressText !== null ? parsed.progressText :
            parsed.partialResult !== undefined && parsed.partialResult !== null ? parsed.partialResult :
            parsed.details !== undefined && parsed.details !== null ? parsed.details :
            parsed.content !== undefined && parsed.content !== null ? parsed.content :
            parsed.text !== undefined && parsed.text !== null ? parsed.text :
            null;
          return {
            id: `history-tool-${index}`,
            toolCallId: parsed.toolCallId,
            sender: 'agent',
            isStatus: true,
            isComplete: parsed.phase === 'result' || parsed.phase === 'end' || Boolean(toolResult || parsed.status === 'completed' || parsed.status === 'failed'),
            toolName: parsed.title || parsed.name,
            toolParams: parsed.meta || parsed.args || {},
            toolResult: toolResult,
            status: parsed.status || (parsed.isError ? 'failed' : 'completed'),
            isError: Boolean(parsed.isError),
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

