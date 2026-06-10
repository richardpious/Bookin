import Editor from '@monaco-editor/react';

export const CodeEditor = ({ filePath, content }) => {
  // If content is an object (like from SimPreview), JSON.stringify it for the editor
  const displayContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;

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
};

