import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,       
  breaks: true,     
  linkify: true,     
  typographer: true,
});

export function markdownToHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    const html = md.render(text);
    const trimmed = html.trim();
    if (trimmed.startsWith('<p>') && trimmed.endsWith('</p>') && trimmed.split('<p>').length === 2) {
      return trimmed.slice(3, -4);
    }
    return trimmed;
  } catch {
    return text;
  }
}


export function hasMarkdownSyntax(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const markdownPatterns = [
    /\*\*[^*]+\*\*/,           // Bold **text**
    /\*[^*]+\*/,               // Italic *text*
    /__[^_]+__/,               // Bold __text__
    /_[^_]+_/,                 // Italic _text_
    /~~[^~]+~~/,               // Strikethrough ~~text~~
    /\[.+\]\(.+\)/,            // Links [text](url)
    /^#{1,6}\s+/m,             // Headers # text
    /^\* /m,                   // Unordered list
    /^\d+\. /m,                // Ordered list
    /^> /m,                    // Blockquote
    /`[^`]+`/,                 // Inline code
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

