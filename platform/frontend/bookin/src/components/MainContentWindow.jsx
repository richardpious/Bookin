import { CodeEditor } from './CodeEditor';
import { MainContentHome } from './MainContentHome';

export const MainContentWindow = ({ filePath, content }) => {
  return (
    <main className="main-content" style={{ height: '100vh', width: '100%' }}>
      {filePath ? (
      <CodeEditor filePath={filePath} content={content} />
      ) : (
        <MainContentHome />
      )}
    </main>
  );
};