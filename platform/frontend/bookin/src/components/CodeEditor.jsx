import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-dark.css';

export const CodeEditor = React.memo(({ filePath, content, activeLine, onFileClick }) => {
  const editorRef = useRef(null);

  // If content is an object (like from SimPreview), JSON.stringify it for the editor
  const displayContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;

  const onMount = (editor) => {
    editorRef.current = editor;
    // Always focus and reveal on mount
    if (activeLine) {
        editor.revealLineInCenter(activeLine);
        editor.setPosition({ lineNumber: activeLine, column: 1 });
        editor.focus();
    }
  };

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
      <div style={{ padding: '40px', height: '100%', overflowY: 'scroll', display: 'flex', flexDirection: 'column' }} className="markdown-body">
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

