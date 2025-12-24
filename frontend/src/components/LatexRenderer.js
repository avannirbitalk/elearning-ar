import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function LatexRenderer({ content }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    // Split content by LaTeX delimiters
    const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);
    
    containerRef.current.innerHTML = parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Display math
        const latex = part.slice(2, -2);
        try {
          return `<div class="katex-display">${katex.renderToString(latex, { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {
          return `<span class="text-red-500">${part}</span>`;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const latex = part.slice(1, -1);
        try {
          return katex.renderToString(latex, { displayMode: false, throwOnError: false });
        } catch (e) {
          return `<span class="text-red-500">${part}</span>`;
        }
      } else {
        // Regular text - convert newlines to <br>
        return part.replace(/\n/g, '<br>');
      }
    }).join('');
  }, [content]);

  return <div ref={containerRef} className="latex-content whitespace-pre-wrap" />;
}
