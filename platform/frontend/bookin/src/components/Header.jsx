import { ChatSidebar } from './ChatSidebar'
import { LeftSidebar } from './LeftSidebar'
import { MainContentWindow } from './MainContentWindow'
import { readFileContent } from '../utils/fileUtils'

export const Header = () => (
  <header className="app-header">
    <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
      <img src="/logo.png" alt="BookIn Logo" style={{ height: '24px', marginRight: '10px' }} />
      <span className="logo">BookIn</span>
    </div>
  </header>
)

