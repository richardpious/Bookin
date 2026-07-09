export const fetchChatHistory = async (sessionId) => {
  try {
    const response = await fetch(`/history/${sessionId}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch chat history');
    }
    const data = await response.json();
    // Convert backend format to frontend format
    return data.history.map((msg, index) => ({
      id: index,
      sender: msg.sender === 'agent' ? 'bot' : 'user',
      text: msg.message,
      isComplete: true
    }));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
};

