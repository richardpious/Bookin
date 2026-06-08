import Editor from '@monaco-editor/react';

export const CodeEditor = ({ filePath, content }) => {
  return (
    <Editor
      height="100%"
      path={filePath}
      defaultLanguage="javascript"
      value={content}
      theme="vs-dark"
      options={{
        readOnly: true,
        automaticLayout: true,
      }}
    />
  );
};
