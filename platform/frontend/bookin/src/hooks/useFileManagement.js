import { useState, useRef, useEffect, useCallback } from 'react';
import { readFileContent, updateFileContent } from '../utils/fileUtils';

export const useFileManagement = () => {
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [savedFileContents, setSavedFileContents] = useState({}); // Track original saved state

  const handleFileClick = async (path, replace = false) => {
    let newOpenFiles = [...openFiles];

    // If replace is true, remove the currently active file from the list
    if (replace && activeFile) {
      newOpenFiles = newOpenFiles.filter(f => f !== activeFile);
    }

    // Check if the file is already open
    if (!newOpenFiles.includes(path)) {
      newOpenFiles.push(path);
      setOpenFiles(newOpenFiles);
    }

    // Intercept logs-viewer virtual tabs
    if (path.startsWith('logs-viewer:')) {
      setActiveFile(path);
      return path;
    }

    // Always fetch content, because the backend might have redirected us
    // to a different file (e.g. README.md) than the path we requested.
    try {
      const result = await readFileContent(path);
      const { content, resolvedPath } = result;

      // Update contents with the actual resolved path
      setFileContents(prev => ({ ...prev, [resolvedPath]: content }));
      setSavedFileContents(prev => ({ ...prev, [resolvedPath]: content })); // Init saved state

      // If the path was redirected, update openFiles
      // Replace the placeholder 'path' with the 'resolvedPath' if needed
      const finalFiles = newOpenFiles.map(p => p === path ? resolvedPath : p);
      setOpenFiles(finalFiles);
      setActiveFile(resolvedPath);
      return resolvedPath; // Return the actual path
    } catch (err) {
      console.error(err);
      setFileContents(prev => ({ ...prev, [path]: 'Error loading file content.' }));
      setActiveFile(path);
      return path;
    }
  };

  const handleOpenFilePreview = useCallback(async (filePath) => {
    console.log("handleOpenFilePreview called for file:", filePath);

    try {
      const result = await readFileContent(filePath);
      const { content, resolvedPath } = result;

      setFileContents(prev => ({ ...prev, [resolvedPath]: content }));

      setOpenFiles(prev => {
          if (!prev.includes(resolvedPath)) {
              return [...prev, resolvedPath];
          }
          return prev;
      });

      setActiveFile(resolvedPath);
    } catch (err) {
      console.error(err);
      // For preview, we try to set the content even if it's an error
      // so the user knows something tried to open
      setFileContents(prev => ({ ...prev, [filePath]: `Error loading file: ${filePath}` }));
      setActiveFile(filePath);
    }
  }, []);

  const handleSilentFileUpdate = useCallback(async (filePath) => {
    console.log("handleSilentFileUpdate called for file:", filePath);
    try {
      const result = await readFileContent(filePath);
      const { content, resolvedPath } = result;
      setFileContents(prev => ({ ...prev, [resolvedPath]: content }));
    } catch (err) {
      console.error("Silent update failed for file:", filePath, err);
    }
  }, []);

  const handleCloseFile = (e, path) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== path);
    setOpenFiles(newOpenFiles);

    // Clear content from memory
    setFileContents(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });

    if (activeFile === path) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  const handleUpdateFileContent = async (path, newContent) => {
    try {
      await updateFileContent(path, newContent);
      setFileContents(prev => ({ ...prev, [path]: newContent })); // Explicitly sync live state
      setSavedFileContents(prev => ({ ...prev, [path]: newContent })); // Update saved state
    } catch (err) {
      console.error(err);
      alert(`Error updating file: ${err.message}`);
    }
  };

  const handleEditContent = (path, newContent) => {
    // Only update the live content, NOT the saved content
    setFileContents(prev => ({ ...prev, [path]: newContent }));
  };

  return {
    openFiles,
    activeFile,
    fileContents,
    savedFileContents,
    handleFileClick,
    handleOpenFilePreview,
    handleSilentFileUpdate,
    handleCloseFile,
    handleUpdateFileContent,
    handleEditContent,
    setActiveFile
  };
};

