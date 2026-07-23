import { useState, useRef, useEffect, useCallback } from 'react';
import { readFileContent, updateFileContent } from '../utils/fileUtils';

const fastHash = (str) => {
  if (!str) return 0;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash;
};

export const useFileManagement = () => {
  const [openFiles, setOpenFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('openFiles');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeFile, setActiveFile] = useState(() => {
    return localStorage.getItem('activeFile') || null;
  });
  const [fileContents, setFileContents] = useState({});
  const [dirtyFiles, setDirtyFiles] = useState({}); // Track dirty state without storing full strings twice
  const savedHashesRef = useRef({});
  const [hasUnreadLogs, setHasUnreadLogs] = useState(false);

  const activeFileRef = useRef(activeFile);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // Persist openFiles and activeFile to localStorage
  useEffect(() => {
    localStorage.setItem('openFiles', JSON.stringify(openFiles));
  }, [openFiles]);

  useEffect(() => {
    if (activeFile) {
      localStorage.setItem('activeFile', activeFile);
    } else {
      localStorage.removeItem('activeFile');
    }
  }, [activeFile]);

  // On mount, re-fetch contents for any restored open files
  useEffect(() => {
    const restoreFileContents = async () => {
      const filesToRestore = openFiles.filter(
        path => !path.startsWith('logs-viewer:')
      );
      if (filesToRestore.length === 0) return;

      const results = await Promise.allSettled(
        filesToRestore.map(path => readFileContent(path))
      );

      const newContents = {};
      const newDirty = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { content, resolvedPath } = result.value;
          newContents[resolvedPath] = content;
          savedHashesRef.current[resolvedPath] = fastHash(content);
          newDirty[resolvedPath] = false;
        }
      });

      setFileContents(prev => ({ ...prev, ...newContents }));
      setDirtyFiles(prev => ({ ...prev, ...newDirty }));
    };

    restoreFileContents();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearUnreadLogs = useCallback(() => {
    setHasUnreadLogs(false);
  }, []);

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
      setHasUnreadLogs(false);
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
      savedHashesRef.current[resolvedPath] = fastHash(content);
      setDirtyFiles(prev => ({ ...prev, [resolvedPath]: false }));

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
      savedHashesRef.current[resolvedPath] = fastHash(content);
      setDirtyFiles(prev => ({ ...prev, [resolvedPath]: false }));

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
      setOpenFiles(prev => {
          if (!prev.includes(filePath)) {
              return [...prev, filePath];
          }
          return prev;
      });
      setActiveFile(filePath);
    }
  }, []);

  const handleSilentFileUpdate = useCallback(async (filePath) => {
    console.log("handleSilentFileUpdate called for file:", filePath);
    
    // Check if the file is in logs/ or is a .log file
    if (filePath && (filePath.includes('/logs/') || filePath.includes('logs/') || filePath.endsWith('.log'))) {
      if (!activeFileRef.current?.startsWith('logs-viewer:')) {
        setHasUnreadLogs(true);
      }
    }

    try {
      const result = await readFileContent(filePath);
      const { content, resolvedPath } = result;
      setFileContents(prev => ({ ...prev, [resolvedPath]: content }));
      savedHashesRef.current[resolvedPath] = fastHash(content);
      setDirtyFiles(prev => ({ ...prev, [resolvedPath]: false }));
    } catch (err) {
      console.error("Silent update failed for file:", filePath, err);
    }
  }, []);

  const handleCloseFile = (e, path) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== path);
    setOpenFiles(newOpenFiles);

    // Clear content & hashes from memory
    delete savedHashesRef.current[path];
    setFileContents(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setDirtyFiles(prev => {
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
      savedHashesRef.current[path] = fastHash(newContent);
      setDirtyFiles(prev => ({ ...prev, [path]: false }));
    } catch (err) {
      console.error(err);
      alert(`Error updating file: ${err.message}`);
    }
  };

  const handleEditContent = (path, newContent) => {
    // Only update the live content & compute dirty boolean vs saved hash
    setFileContents(prev => ({ ...prev, [path]: newContent }));
    const savedHash = savedHashesRef.current[path];
    const isDirty = savedHash !== undefined ? fastHash(newContent) !== savedHash : false;
    setDirtyFiles(prev => prev[path] === isDirty ? prev : { ...prev, [path]: isDirty });
  };

  return {
    openFiles,
    activeFile,
    fileContents,
    dirtyFiles,
    hasUnreadLogs,
    clearUnreadLogs,
    handleFileClick,
    handleOpenFilePreview,
    handleSilentFileUpdate,
    handleCloseFile,
    handleUpdateFileContent,
    handleEditContent,
    setActiveFile
  };
};

