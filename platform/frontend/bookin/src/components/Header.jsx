export const Header = () => (
  <header className="app-header">
    <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
      <img src="/logo.png" alt="BookIn Logo" style={{ height: '24px', marginRight: '10px' }} />
      <span className="logo">BookIn</span>
    </div>
    <div className="header-right">
      <button className="nav-item">Session</button>
    </div>
  </header>
)
