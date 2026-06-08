export const ChatInput = ({ input, setInput, onSend, isLoading }) => (
  <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && onSend()}
      placeholder="Type a message..."
      disabled={isLoading}
      style={{ 
        flex: 1,
        minWidth: 0,
        padding: '0 12px',
        fontSize: '14px',
        height: '36px',
        lineHeight: '36px',
        borderRadius: '6px',
        backgroundColor: '#292929',
        color: 'white',
        border: 'none',
        boxSizing: 'border-box'
      }}
    />
    <button 
      onClick={onSend} 
      disabled={isLoading} 
      style={{ 
        padding: '0 16px',
        fontSize: '14px',
        height: '36px',
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#292929',
        border: 'none',
        color: 'white'
      }}
    >
      {isLoading ? '...' : 'Send'}
    </button>
  </div>
)
