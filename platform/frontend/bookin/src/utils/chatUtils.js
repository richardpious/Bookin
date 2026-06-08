export const sendMessage = async (input, setMessages, setIsLoading) => {
  const userMessage = { id: Date.now(), sender: 'user', text: input };
  setMessages((prev) => [...prev, userMessage]);
  setIsLoading(true);

  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: input }),
    });
    const data = await response.json();
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: data.message }]);
  } catch (error) {
    console.error('Error sending message:', error);
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: 'Sorry, I encountered an error.' }]);
  } finally {
    setIsLoading(false);
  }
};
