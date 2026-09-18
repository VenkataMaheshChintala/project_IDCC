import React from 'react';

interface RawTextWithImagesProps {
  text: string;
  className?: string;
}

export function RawTextWithImages({ text, className = '' }: RawTextWithImagesProps) {
  if (!text) return null;

  const parts = [];
  // Regex to match markdown images: ![alt](url)
  const regex = /!\[([^\]]*)\]\((.*?)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the image
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }
    // Add the image
    parts.push(
      <img
        key={`img-${match.index}`}
        src={match[2]}
        alt={match[1]}
        className="max-w-full h-auto my-3 rounded-md"
      />
    );
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }

  return (
    <div className={`whitespace-pre-wrap font-sans break-words ${className}`}>
      {parts}
    </div>
  );
}
