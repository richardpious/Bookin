import React, { useEffect, useState } from 'react'
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { fetchFiles } from '../utils/fileUtils'

const FileNode = React.memo(({ name, path, isDir, onFileClick, activeFile, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(false)
  const isActive = path === activeFile

  const handleClick = async (e) => {
    e.stopPropagation();
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
    } else {
      onFileClick(path)
    }
  }

  const itemHeight = 28;
  const stickyTop = 120 + (depth * itemHeight);

  return (
    <div style={{ marginBottom: '2px' }}>
      <div
        className={`file-item ${isActive ? 'active' : ''}`}
        onClick={handleClick}
        onMouseOver={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = '#2a2a2a';
        }}
        onMouseOut={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-sidebar)';
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          height: `${itemHeight}px`,
          boxSizing: 'border-box',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: isActive ? '#323232' : 'var(--bg-sidebar)',
          color: isActive ? '#ffffff' : 'inherit',
          transition: 'background-color 0.2s',
          position: isDir ? 'sticky' : 'static',
          top: isDir ? `${stickyTop}px` : 'auto',
          zIndex: isDir ? 14 - depth : 'auto',
        }}
          >
        {isDir && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        {!isDir && <div style={{width: 16}} />}
        {isDir ? <Folder size={16} /> : <FileText size={16} />}
        <span>{name}</span>
      </div>
      {isOpen && isDir && (
        <div style={{ marginLeft: '16px' }}>
          {children.map((child) => (
            <FileNode key={child.path} {...child} onFileClick={onFileClick} activeFile={activeFile} depth={depth + 1} />
        ))}
      </div>
      )}
    </div>
  )
})

export const ProjectFilesList = React.memo(({ onFileClick, activeFile }) => {
  const [files, setFiles] = useState([])

  useEffect(() => {
    // Only fetch from the allowed project folders
    // We fetch them individually to avoid showing the root folder contents
    const fetchAllowedFolders = async () => {
      try {
        const rootFiles = await fetchFiles(".");
        // Filter out 'docs' and 'configs' folders
        const allowed = rootFiles.filter(f => ['booksim'].includes(f.name));
        setFiles(allowed);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAllowedFolders();
  }, [])
  return (
    <>
      <div className="project-section" style={{
        marginTop: '0',
        position: 'sticky',
        top: '80px',
        backgroundColor: 'var(--bg-sidebar)',
        zIndex: 15,
        padding: '0.5rem 0',
        height: '40px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0 }}>Booksim Files</h3>
      </div>
      <div className="files-list">
      {files.map((file) => (
        <FileNode key={file.path} {...file} onFileClick={onFileClick} activeFile={activeFile} />
      ))}
      </div>
    </>
  )
})

