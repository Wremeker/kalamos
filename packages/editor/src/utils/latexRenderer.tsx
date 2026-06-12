import React from 'react';
import katex from 'katex';

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

export function renderTextWithLatex(text: string): React.ReactNode[] {
  if (!text) return [];

  const decodedText = decodeHtmlEntities(text);

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  const combinedRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)(?:[^\$]|\\\$)+?\$)/g;
  const matches = [...decodedText.matchAll(combinedRegex)];

  matches.forEach((match, idx) => {
    const fullMatch = match[0];
    const matchIndex = match.index!;

    if (matchIndex > lastIndex) {
      const textBefore = decodedText.substring(lastIndex, matchIndex);
      result.push(
        <span 
          key={`text-${idx}-${lastIndex}`} 
          dangerouslySetInnerHTML={{ __html: textBefore }}
        />
      );
    }

    // Determine if block/display mode and extract LaTeX content
    let isBlock = false;
    let latexContent = '';
    
    if (fullMatch.startsWith('$$')) {
      isBlock = true;
      latexContent = fullMatch.substring(2, fullMatch.length - 2);
    } else if (fullMatch.startsWith('\\[')) {
      isBlock = true;
      latexContent = fullMatch.substring(2, fullMatch.length - 2);
    } else if (fullMatch.startsWith('\\(')) {
      isBlock = false;
      latexContent = fullMatch.substring(2, fullMatch.length - 2);
    } else if (fullMatch.startsWith('$')) {
      isBlock = false;
      latexContent = fullMatch.substring(1, fullMatch.length - 1);
    }

    try {
      const html = katex.renderToString(latexContent, {
        displayMode: isBlock,
        throwOnError: false,
        output: 'html',
        trust: false,
      });

      result.push(
        <span
          key={`latex-${idx}-${matchIndex}`}
          dangerouslySetInnerHTML={{ __html: html }}
          className={isBlock ? 'block my-2' : 'inline-block mx-0.5'}
        />
      );
    } catch (err) {
      console.warn('LaTeX render error:', err, 'Content:', latexContent);
      result.push(
        <span key={`error-${idx}-${matchIndex}`} className="text-red-500 font-mono text-sm">
          {fullMatch}
        </span>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  });

  if (lastIndex < decodedText.length) {
    const textAfter = decodedText.substring(lastIndex);
    result.push(
      <span 
        key={`text-end`} 
        dangerouslySetInnerHTML={{ __html: textAfter }}
      />
    );
  }

  if (result.length === 0 && decodedText) {
    return [
      <span 
        key="text-only" 
        dangerouslySetInnerHTML={{ __html: decodedText }}
      />
    ];
  }

  return result.length > 0 ? result : [decodedText];
}


export function hasLatexExpressions(text: string): boolean {
  if (!text) return false;
  const decoded = decodeHtmlEntities(text);
  return /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)(?:[^\$]|\\\$)+?\$)/.test(decoded);
}

export function hasHtmlTags(text: string): boolean {
  if (!text) return false;
  return /<[^>]+>/.test(text);
}

export function renderTextWithHtml(text: string): React.ReactNode {
  if (!text) return null;
  
  if (hasLatexExpressions(text)) {
    const result = renderTextWithLatex(text);
    if (result.length === 1) {
      return result[0];
    }
    return <>{result}</>;
  }
  
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

