import { useEffect, useState } from 'react'
import { Folder, FileText } from 'lucide-react'
import { fetchFiles } from '../utils/fileUtils'

export const FilesSidebar = ({ width }) => {
  const [files, setFiles] = useState([])

  useEffect(() => {
    fetchFiles()
      .then(setFiles)
      .catch(err => console.error(err))
  }, [])

  return (
    <aside className="sidebar files-sidebar" style={{ width }}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h2>BookIn</h2>
        </div>
        <div className="project-section">
          <h3>Project Files</h3>
          {files.map((file, index) => (
            <div key={index} className="file-item" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '4px'}}>
              {file.isDir ? <Folder size={16} /> : <FileText size={16} />}
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

