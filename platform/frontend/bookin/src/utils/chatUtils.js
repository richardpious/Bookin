export const sendMessage = async (input, setMessages) => {
  const userMessage = { id: Date.now(), sender: 'user', text: input };
  setMessages((prev) => [...prev, userMessage]);

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
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'bot', text: error.message }]);
  }
};
