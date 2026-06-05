import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const ChatMessage = ({ sender, text }) => (
  <div className={`message-row ${sender}`}>
    <div className={`message-bubble ${sender}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  </div>
);
