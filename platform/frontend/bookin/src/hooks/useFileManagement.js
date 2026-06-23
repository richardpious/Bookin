import { useState, useRef, useEffect, useCallback } from 'react';
import { readFileContent, updateFileContent } from '../utils/fileUtils';

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

  const handleOpenFilePreview = useCallback(async (filePath) => {
    console.log("handleOpenFilePreview called for file:", filePath);

    // We reuse the existing logic for opening a file
    if (!openFiles.includes(filePath)) {
      setOpenFiles(prev => [...prev, filePath]);
      try {
        const content = await readFileContent(filePath);
        setFileContents(prev => ({ ...prev, [filePath]: content }));
      } catch (err) {
        console.error(err);
        setFileContents(prev => ({ ...prev, [filePath]: `Error loading file: ${filePath}` }));
      }
    }
    setActiveFile(filePath);
  }, [openFiles]);

  const handleCloseFile = (e, path) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== path);
    setOpenFiles(newOpenFiles);
    if (activeFile === path) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  const handleUpdateFileContent = async (path, newContent) => {
    try {
      await updateFileContent(path, newContent);
      setFileContents(prev => ({ ...prev, [path]: newContent }));
    } catch (err) {
      console.error(err);
      alert(`Error updating file: ${err.message}`);
    }
  };

  return { openFiles, activeFile, fileContents, handleFileClick, handleOpenFilePreview, handleCloseFile, handleUpdateFileContent, setActiveFile };
};

