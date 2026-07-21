import React, { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-dark.css';

export const CodeEditor = React.memo(({ filePath, content, activeLine, onFileClick, onToast, onEditContent, onUpdateFile }) => {
  const editorRef = useRef(null);
  const monaco = useMonaco();
  const saveFile = async (currentContent) => {
    console.log(`Attempting to save to: ${filePath}`);
    try {
      // Direct path to the router endpoint, assuming backend is running on same port
      // or proxied correctly.
      const response = await fetch('/update-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content: currentContent }),
      });
      const result = await response.json();
      if (result.success) {
        if (onToast) onToast('File saved successfully', 'success');

        // This will update both live content AND saved content via useFileManagement
        if (onUpdateFile) {
            onUpdateFile(filePath, currentContent);
        }
        // Force the parent to recognize the save by invoking the main update handler too if needed
        // but since we updated the live content, that's enough to match the dirty check.
      } else {
        console.error('Save failed:', result.error);
        if (onToast) onToast(`Error saving file: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      if (onToast) onToast(`Error connecting to backend: ${error.message}`, 'error');
    }
  };

  // If content is an object (like from SimPreview), JSON.stringify it for the editor
  const displayContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;

  const onMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
        saveFile(editor.getValue());
      });

    editor.onDidChangeModelContent(() => {
        if (onEditContent) {
            onEditContent(filePath, editor.getValue());
        }
    });

    // Always focus and reveal on mount
    if (activeLine) {
        editor.revealLineInCenter(activeLine);
        editor.setPosition({ lineNumber: activeLine, column: 1 });
        editor.focus();
    }
  };

  useEffect(() => {
    if (monaco && editorRef.current) {
        // Need to remove old command or handle multiple mounts properly if necessary
        // But for this simple implementation, it should work fine on the first mount.
    }
  }, [monaco]);

  useEffect(() => {
    console.log("CodeEditor useEffect triggered, activeLine:", activeLine);
    if (editorRef.current) {
      if (activeLine) {
      editorRef.current.revealLineInCenter(activeLine);
      editorRef.current.setPosition({ lineNumber: activeLine, column: 1 });
      editorRef.current.focus();
    }
    }
  }, [activeLine, content]);

  // FIX: Check for .md extension case-insensitively
  if (filePath.toLowerCase().endsWith('.md')) {
    const components = {
      a: ({ node, ...props }) => (
        <a {...props} onClick={(e) => {
          e.preventDefault();
          const href = props.href;
          if (href) {
            // Assume links are relative to /docs or root
            let targetPath = href;
            if (href.startsWith('./')) {
                targetPath = href.substring(2);
            }
                // Determine base directory of current file
                const baseDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);

            // If it's a relative link, prepend base directory
            if (!targetPath.startsWith('docs/')) {
                targetPath = baseDir + targetPath;
            }

            // Clean up the path (resolve relative segments like '../')
            const parts = targetPath.split('/');
            const normalizedParts = [];
            for (const part of parts) {
                if (part === '..') {
                    if (normalizedParts.length > 0) normalizedParts.pop();
                } else if (part !== '.' && part !== '') {
                    normalizedParts.push(part);
                }
            }
            const normalizedPath = normalizedParts.join('/');
            console.log(`Navigating from ${filePath} to: ${normalizedPath}`);
            // Pass true to replace the current tab
            onFileClick(normalizedPath, true);
          }
        }} />
      )
    };
    return (
      <div style={{ padding: '40px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }} className="markdown-body">
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{displayContent}</ReactMarkdown>
      </div>
      </div>
    );
  }

  return (
    <Editor
      key={filePath}
      height="100%"
      path={filePath}
      onMount={onMount}
      defaultLanguage={filePath.endsWith('.json') ? 'json' : 'javascript'}
      value={displayContent}
      theme="vs-dark"
      options={{
        readOnly: false,
        automaticLayout: true,
      }}
    />
  );
});

