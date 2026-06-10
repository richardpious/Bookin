import { useState, useRef, useEffect, useCallback } from 'react';
import { readFileContent } from '../utils/fileUtils';

export const useFileManagement = () => {
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});

  const handleFileClick = async (path) => {
    if (!openFiles.includes(path)) {
      setOpenFiles([...openFiles, path]);
      try {
        const content = await readFileContent(path);
        setFileContents(prev => ({ ...prev, [path]: content }));
      } catch (err) {
        console.error(err);
        setFileContents(prev => ({ ...prev, [path]: 'Error loading file content.' }));
      }
    }
    setActiveFile(path);
  };

  const handleOpenSimPreview = useCallback((previewData) => {
    console.log("handleOpenSimPreview called with:", previewData);
    const fileName = previewData.config_file || `preview-${Date.now()}.json`;
    // We store the data object directly instead of stringifying it
    if (!openFiles.includes(fileName)) {
      console.log("Opening new tab for:", fileName);
      setOpenFiles(prev => [...prev, fileName]);
      setFileContents(prev => ({ ...prev, [fileName]: previewData }));
    }
    setActiveFile(fileName);
  }, [openFiles]);
  const handleCloseFile = (e, path) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== path);
    setOpenFiles(newOpenFiles);
    if (activeFile === path) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  return { openFiles, activeFile, fileContents, handleFileClick, handleOpenSimPreview, handleCloseFile, setActiveFile };
};

