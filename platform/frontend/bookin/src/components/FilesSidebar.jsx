import { useEffect, useState } from 'react'
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { fetchFiles } from '../utils/fileUtils'

const FileNode = ({ name, path, isDir }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(false)

  const toggleFolder = async () => {
    if (isDir) {
      if (!isOpen) {
        setLoading(true)
        try {
          const fetchedFiles = await fetchFiles(path)
          setChildren(fetchedFiles)
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      setIsOpen(!isOpen)
    }
  }

  return (
    <div>
      <div 
        className="file-item" 
        onClick={toggleFolder}
        style={{display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', cursor: 'pointer'}}
      >
        {isDir && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        {!isDir && <div style={{width: 16}} />}
        {isDir ? <Folder size={16} /> : <FileText size={16} />}
        <span>{name}</span>
      </div>
      {isOpen && isDir && (
        <div style={{ marginLeft: '20px' }}>
          {children.map((child) => (
            <FileNode key={child.path} {...child} />
          ))}
        </div>
      )}
    </div>
  )
}

export const FilesSidebar = ({ width }) => {
  const [files, setFiles] = useState([])

  useEffect(() => {
    fetchFiles()
      .then(setFiles)
      .catch(err => console.error(err))
  }, [])

  return (
    <aside className="sidebar files-sidebar" style={{ width, height: '100vh', overflowY: 'auto' }}>
      <div className="sidebar-content">
        <div className="project-section">
          <h3>Project Files</h3>
          {files.map((file) => (
            <FileNode key={file.path} {...file} />
          ))}
        </div>
      </div>
    </aside>
  )
}

