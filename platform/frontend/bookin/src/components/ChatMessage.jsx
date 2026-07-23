import React, { useMemo } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EmbeddedFile } from './EmbeddedFile';

const EMBED_REGEX = /\[embed\s+([^\]]+)\s*\/\]/g;
const ATTR_REGEX = /(\w+)="([^"]*)"/g;

const remarkPlugins = [remarkGfm];

export const ChatMessage = React.memo(({ sender, text, isError }) => {
  // Memoize the embed parsing so it only re-runs when `text` changes
  const parts = useMemo(() => {
    const result = [];
    let lastIndex = 0;
    let match;
    // Reset regex state since it has the global flag
    EMBED_REGEX.lastIndex = 0;

    while ((match = EMBED_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }

      const attrString = match[1];
      ATTR_REGEX.lastIndex = 0;
      const attrs = {};
      let attrMatch;
      while ((attrMatch = ATTR_REGEX.exec(attrString)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      result.push({ type: 'embed', attrs });
      lastIndex = EMBED_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return result;
  }, [text]);

  // If no embeds were found, we can just render everything in one ReactMarkdown to avoid wrapping fragments
  if (parts.length === 1 && parts[0].type === 'text') {
    return (
      <div className={`message-row ${sender}`}>
        <div className={`message-bubble ${sender}${isError ? ' message-error' : ''}`}>
          <ReactMarkdown remarkPlugins={remarkPlugins}>
            {text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-row ${sender}`}>
      <div className={`message-bubble ${sender}${isError ? ' message-error' : ''}`}>
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <ReactMarkdown key={i} remarkPlugins={remarkPlugins}>
                {part.content}
              </ReactMarkdown>
            );
          } else if (part.type === 'embed') {
            return (
              <EmbeddedFile 
                key={i} 
                refPath={part.attrs.ref} 
                title={part.attrs.title} 
                height={part.attrs.height} 
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
});
