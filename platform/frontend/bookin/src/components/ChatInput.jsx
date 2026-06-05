export const ChatInput = ({ input, setInput, onSend, isLoading }) => (
  <>
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && onSend()}
      placeholder="Type a message..."
      disabled={isLoading}
    />
    <button onClick={onSend} disabled={isLoading}>
      {isLoading ? '...' : 'Send'}
    </button>
  </>
)
