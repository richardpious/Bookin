import React from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-dark.css';

export const CodeEditor = React.memo(({ filePath, content, onFileClick }) => {
  // If content is an object (like from SimPreview), JSON.stringify it for the editor
  const displayContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;

  if (filePath.endsWith('.md')) {
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
            // If it's a relative link within docs, prepend docs/
            if (!targetPath.startsWith('docs/')) {
                // Determine base directory of current file
                const baseDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
                targetPath = baseDir + targetPath;
            }
            onFileClick(targetPath);
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
      height="100%"
      path={filePath}
      defaultLanguage={filePath.endsWith('.json') ? 'json' : 'javascript'}
      value={displayContent}
      theme="vs-dark"
      options={{
        readOnly: true,
        automaticLayout: true,
      }}
    />
  );
});

