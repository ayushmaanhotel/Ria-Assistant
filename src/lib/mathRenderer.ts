/**
 * Math Renderer Utility
 * Parses text for LaTeX math delimiters ($...$, $$...$$)
 * and renders them using KaTeX loaded from CDN.
 */

declare global {
  interface Window {
    katex?: {
      renderToString: (tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }) => string;
    };
  }
}

/**
 * Check if KaTeX is available (loaded from CDN).
 */
export function isKaTeXAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.katex;
}

/**
 * Render a LaTeX string to HTML using KaTeX.
 * Returns the original string wrapped in a code tag if KaTeX is not available.
 */
function renderTeX(tex: string, displayMode: boolean): string {
  if (!isKaTeXAvailable()) {
    return displayMode ? `<div class="math-fallback">${tex}</div>` : `<code>${tex}</code>`;
  }
  try {
    return window.katex!.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return `<code class="math-error">${tex}</code>`;
  }
}

/**
 * Parse text content and replace math delimiters with rendered HTML.
 * Supports:
 * - $$...$$ for display (block) math
 * - $...$ for inline math
 * - \[...\] for display math
 * - \(...\) for inline math
 *
 * Non-math text is HTML-escaped to prevent XSS.
 */
export function renderMathInText(text: string): string {
  if (!text) return '';

  // Escape HTML in non-math parts
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Process display math first ($$...$$), then inline ($...$)
  // Using a state machine approach to avoid regex pitfalls
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    // Check for display math: $$...$$
    if (text[i] === '$' && i + 1 < len && text[i + 1] === '$') {
      const start = i + 2;
      const end = text.indexOf('$$', start);
      if (end !== -1) {
        const tex = text.substring(start, end);
        result += renderTeX(tex, true);
        i = end + 2;
        continue;
      }
    }

    // Check for display math: \[...\]
    if (text[i] === '\\' && i + 1 < len && text[i + 1] === '[') {
      const start = i + 2;
      const end = text.indexOf('\\]', start);
      if (end !== -1) {
        const tex = text.substring(start, end);
        result += renderTeX(tex, true);
        i = end + 2;
        continue;
      }
    }

    // Check for inline math: \(...\)
    if (text[i] === '\\' && i + 1 < len && text[i + 1] === '(') {
      const start = i + 2;
      const end = text.indexOf('\\)', start);
      if (end !== -1) {
        const tex = text.substring(start, end);
        result += renderTeX(tex, false);
        i = end + 2;
        continue;
      }
    }

    // Check for inline math: $...$  (single dollar, not $$)
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '$') && i + 1 < len && text[i + 1] !== '$') {
      const start = i + 1;
      let end = -1;
      for (let j = start; j < len; j++) {
        if (text[j] === '$' && text[j - 1] !== '\\') {
          end = j;
          break;
        }
        if (text[j] === '\n') break; // Inline math doesn't span lines
      }
      if (end !== -1 && end > start) {
        const tex = text.substring(start, end);
        result += renderTeX(tex, false);
        i = end + 1;
        continue;
      }
    }

    // Check for newlines → <br>
    if (text[i] === '\n') {
      result += '<br/>';
      i++;
      continue;
    }

    // Regular character — escape HTML
    result += escapeHtml(text[i]);
    i++;
  }

  return result;
}
