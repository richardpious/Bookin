export const sendMessage = async (input, setMessages, setIsLoading) => {
  const userMessage = { id: Date.now(), sender: 'user', text: input };
  setMessages((prev) => [...prev, userMessage]);
  setIsLoading(true);

  // The chat is now handled via WebSocket in App.jsx.
  // This function is no longer needed for primary chat communication.
    setIsLoading(false);
};

