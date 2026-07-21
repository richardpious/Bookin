import React from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EmbeddedFile } from './EmbeddedFile';

export const ChatMessage = ({ sender, text, isError }) => {
  // Regex to find [embed ... /] tags
  const embedRegex = /\[embed\s+([^\]]+)\s*\/\]/g;
  
  // Parse the message text into chunks of either string or embed object
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = embedRegex.exec(text)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    
    // Parse attributes
    const attrString = match[1];
    const attrRegex = /(\w+)="([^"]*)"/g;
    const attrs = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    
    parts.push({ type: 'embed', attrs });
    lastIndex = embedRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  // If no embeds were found, we can just render everything in one ReactMarkdown to avoid wrapping fragments
  if (parts.length === 1 && parts[0].type === 'text') {
    return (
      <div className={`message-row ${sender}`}>
        <div className={`message-bubble ${sender}${isError ? ' message-error' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
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
};
