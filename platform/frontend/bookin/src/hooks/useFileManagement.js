import { useState, useRef, useEffect, useCallback } from 'react';
import { readFileContent, updateFileContent } from '../utils/fileUtils';

export const useFileManagement = () => {
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});

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

    // Always fetch content, because the backend might have redirected us
    // to a different file (e.g. README.md) than the path we requested.
    try {
      const result = await readFileContent(path);
      const { content, resolvedPath } = result;

      // Update contents with the actual resolved path
      setFileContents(prev => ({ ...prev, [resolvedPath]: content }));

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

    // FIX: Re-implement without calling handleFileClick with its side-effects
    // that might be causing content to be overwritten or lost.
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
      setFileContents(prev => ({ ...prev, [filePath]: `Error loading file: ${filePath}` }));
      setActiveFile(filePath);
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
      setFileContents(prev => ({ ...prev, [path]: newContent }));
    } catch (err) {
      console.error(err);
      alert(`Error updating file: ${err.message}`);
    }
  };

  return { openFiles, activeFile, fileContents, handleFileClick, handleOpenFilePreview, handleCloseFile, handleUpdateFileContent, setActiveFile };
};

