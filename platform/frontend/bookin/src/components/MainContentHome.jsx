export const MainContentHome = () => {
  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }}>
      <img
        src="/logo.png"
        alt="BookIn Logo"
        style={{
          opacity: 0.3,
          width: '400px',
          marginBottom: '20px',
          pointerEvents: 'none'
        }}
      />
      <div style={{ color: 'var(--text)', opacity: 0.5 }}>Welcome to BookIn</div>
    </div>
  );
};

