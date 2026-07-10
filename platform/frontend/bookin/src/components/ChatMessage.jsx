import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const ChatMessage = ({ sender, text, isError }) => (
  <div className={`message-row ${sender}`}>
    <div className={`message-bubble ${sender}${isError ? ' message-error' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  </div>
);
