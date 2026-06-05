import { motion } from 'framer-motion'
import { Folder, FileText, ChevronRight } from 'lucide-react'

export const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-header">
      <h2>BookIn</h2>
    </div>
    <div className="project-section">
      <h3>Project Files</h3>
      <div className="file-item">
        <Folder size={16} />
        <span>src</span>
        <ChevronRight size={14} />
      </div>
      <div className="file-item">
        <FileText size={16} />
        <span>main.py</span>
      </div>
      <div className="file-item">
        <FileText size={16} />
        <span>App.jsx</span>
      </div>
    </div>
  </aside>
)
