import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, Underline, Heading1, Heading2, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export interface SmartEditorRef {
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  insertVariable: (code: string, name: string) => void;
  applyFormat: (command: string, value?: string) => void;
}

interface SmartEditorProps {
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
  placeholders?: Record<string, string>;
  className?: string;
  placeholderText?: string;
  showToolbar?: boolean;
}

export const SmartEditor = forwardRef<SmartEditorRef, SmartEditorProps>(({
  initialMarkdown = '',
  onChange,
  placeholders = {},
  className = '',
  placeholderText = 'Start typing...',
  showToolbar = true
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const createPillHtml = (code: string, name: string) => {
    return `<span class="pill-chip inline-flex items-center px-2 py-0.5 mx-1 rounded-md text-xs bg-blue-100 text-blue-800 border border-blue-200 select-none cursor-default" data-code="${code}" contenteditable="false" style="vertical-align: middle; display: inline-flex; font-weight: inherit; font-style: inherit; text-decoration: inherit;">` +
      `<span style="font-weight: inherit; font-style: inherit;">${name}</span>` +
      `<span class="pill-remove ml-1 hover:bg-blue-300 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer transition-colors" onclick="this.parentElement.remove()" style="font-weight: bold; font-style: normal;">×</span>` +
      `</span>`;
  };

  const parseMarkdownToHtml = (markdown: string) => {
    if (!markdown || markdown.trim() === '') return '';

    const lines = markdown.split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Numbered list items (1. item, 2. item, etc.)
      const olMatch = line.match(/^\d+\.\s+(.*)/);
      if (olMatch) {
        html += '<ol>';
        while (i < lines.length) {
          const lm = lines[i].match(/^\d+\.\s+(.*)/);
          if (!lm) break;
          html += `<li>${lm[1]}</li>`;
          i++;
        }
        html += '</ol>';
        continue;
      }

      // Bulleted list items (- item)
      const ulMatch = line.match(/^-\s+(.*)/);
      if (ulMatch) {
        html += '<ul>';
        while (i < lines.length) {
          const lm = lines[i].match(/^-\s+(.*)/);
          if (!lm) break;
          html += `<li>${lm[1]}</li>`;
          i++;
        }
        html += '</ul>';
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        html += `<h1>${line.slice(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${line.slice(3)}</h2>`;
      } else if (line.trim()) {
        html += `<p>${line}</p>`;
      } else {
        // Empty line — preserve as a blank paragraph
        html += `<p><br></p>`;
      }
      i++;
    }

    // Handle alignment divs
    html = html.replace(/<div style="text-align: (.*?)">([\s\S]*?)<\/div>/g, '<div style="text-align: $1">$2</div>');

    // Handle Bold & Italic BEFORE variables
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    // Support * for bullets as well as -
    html = html.replace(/^(\s*)\*\s+(.*)$/gm, '$1- $2');

    // Handle variables (pills) LAST
    html = html.replace(/{{([^}]+)}}/g, (match) => {
      const code = match.trim();
      const cleanLabel = code.replace(/{{|}}/g, '').trim();
      const name = placeholders[code] || cleanLabel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return createPillHtml(code, name);
    });

    return html;
  };

  const serializeHtmlToMarkdown = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;

      // For pills: return just the data-code, don't recurse
      if (el.classList.contains('pill-chip')) {
        return el.getAttribute('data-code') || '';
      }

      // Ordered list: number each <li> child
      const tag = el.tagName.toLowerCase();
      if (tag === 'ol') {
        let result = '';
        let index = 1;
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
            let liContent = '';
            child.childNodes.forEach(c => { liContent += walk(c); });
            result += `${index}. ${liContent}\n`;
            index++;
          }
        });
        return result;
      }

      // Unordered list
      if (tag === 'ul') {
        let result = '';
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
            let liContent = '';
            child.childNodes.forEach(c => { liContent += walk(c); });
            result += `- ${liContent}\n`;
          }
        });
        return result;
      }

      // Skip standalone <li> (already handled by ol/ul)
      if (tag === 'li') {
        let content = '';
        el.childNodes.forEach(child => { content += walk(child); });
        return content;
      }

      let content = '';
      el.childNodes.forEach(child => {
        content += walk(child);
      });

      const wrapInTags = (inner: string, start: string, end: string) => {
        if (!inner) return '';
        const match = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match) return start + inner + end;
        return `${match[1]}${start}${match[2]}${end}${match[3]}`;
      };

      if (tag === 'strong' || tag === 'b') return wrapInTags(content, '**', '**');
      if (tag === 'em' || tag === 'i') return wrapInTags(content, '*', '*');
      if (tag === 'u') return wrapInTags(content, '<u>', '</u>');
      if (tag === 'h1') {
        const align = el.style.textAlign;
        const headerMd = `# ${content.trim()}\n`;
        return align && align !== 'left' ? `<div style="text-align: ${align}">${headerMd}</div>\n` : headerMd;
      }
      if (tag === 'h2') {
        const align = el.style.textAlign;
        const headerMd = `## ${content.trim()}\n`;
        return align && align !== 'left' ? `<div style="text-align: ${align}">${headerMd}</div>\n` : headerMd;
      }
      // Support alignment in p and div
      if (tag === 'p' || tag === 'div') {
        const align = el.style.textAlign;
        if (align && align !== 'left') {
          return `<div style="text-align: ${align}">${content}</div>\n`;
        }
        return `${content}\n`;
      }
      if (tag === 'br') return '\n';

      return content;
    };

    let markdown = walk(tempDiv);
    return markdown.replace(/\n{3,}/g, '\n\n');
  };

  const cleanEditorHtml = (editor: HTMLElement) => {
    // Remove empty formatting tags
    editor.querySelectorAll('strong, b, em, i, u').forEach(tag => {
      if (tag.textContent?.trim() === '' && tag.children.length === 0) {
        tag.remove();
      }
    });
  };

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    const editor = editorRef.current;
    if (!editor) return;

    const isFormatting = ['bold', 'italic', 'underline'].includes(command);
    const isAlignment = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(command);

    if (isAlignment) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let container = selection.getRangeAt(0).startContainer;
        const parent = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
        const block = (parent as HTMLElement)?.closest('p, div, h1, h2');
        
        if (block) {
          const align = command.replace('justify', '').toLowerCase();
          const finalAlign = align === 'full' ? 'justify' : align;
          (block as HTMLElement).style.textAlign = finalAlign;
        } else {
          // Fallback to execCommand if no block found
          document.execCommand(command, false, value);
        }
      }
    } else if (isFormatting) {
      const pills = editor.querySelectorAll('.pill-chip');
      pills.forEach(pill => pill.setAttribute('contenteditable', 'true'));
      document.execCommand(command, false, value);
      pills.forEach(pill => pill.setAttribute('contenteditable', 'false'));
      cleanEditorHtml(editor);
    } else {
      document.execCommand(command, false, value);
      cleanEditorHtml(editor);
    }

    editor.focus();
    setTimeout(triggerChange, 0);
  };

  const triggerChange = () => {
    if (onChange && editorRef.current) {
      onChange(serializeHtmlToMarkdown(editorRef.current.innerHTML));
    }
  };

  const insertHtmlAtSelection = (html: string, selection: Selection | null) => {
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    let container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode as Element;
    }
    const closestPill = (container as Element)?.closest?.('.pill-chip');
    if (closestPill) {
      range.setStartAfter(closestPill);
      range.collapse(true);
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const fragment = document.createDocumentFragment();
    let node;
    while ((node = tempDiv.firstChild)) {
      fragment.appendChild(node);
    }

    const spaceNode = document.createTextNode('\u200B');
    fragment.appendChild(spaceNode);

    range.deleteContents();
    range.insertNode(fragment);

    range.setStartAfter(spaceNode);
    range.setEndAfter(spaceNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  useImperativeHandle(ref, () => ({
    getMarkdown: () => editorRef.current ? serializeHtmlToMarkdown(editorRef.current.innerHTML) : '',
    setMarkdown: (markdown: string) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = parseMarkdownToHtml(markdown);
      }
    },
    insertVariable: (code: string, name: string) => {
      const pillHtml = createPillHtml(code, name);
      editorRef.current?.focus();
      insertHtmlAtSelection(pillHtml, window.getSelection());
      triggerChange();
    },
    applyFormat: (command: string, value: string | undefined = undefined) => {
      applyFormat(command, value);
    }
  }));

  useEffect(() => {
    // Set default paragraph separator to p for consistency
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, 'false');

    if (editorRef.current && initialMarkdown !== undefined) {
      const currentMarkdown = serializeHtmlToMarkdown(editorRef.current.innerHTML);
      if (initialMarkdown !== currentMarkdown) {
        editorRef.current.innerHTML = parseMarkdownToHtml(initialMarkdown);
      }
    }
  }, [initialMarkdown]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    const variable = JSON.parse(data);
    const pillHtml = createPillHtml(variable.code, variable.name);

    let range: Range | null = null;
    // @ts-ignore
    if (document.caretPositionFromPoint) {
      // @ts-ignore
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    // @ts-ignore
    else if (document.caretRangeFromPoint) {
      // @ts-ignore
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    }

    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      insertHtmlAtSelection(pillHtml, window.getSelection());
      triggerChange();
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('italic')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('underline')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', 'h1')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Heading 1"
          >
            <Heading1 className="w-5 h-5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', 'h2')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', 'p')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Normal Text"
          >
            <Type className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyLeft')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyCenter')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyRight')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyFull')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={triggerChange}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-8 bg-white overflow-y-auto outline-none text-[16px] text-gray-800 leading-relaxed white-space-pre-wrap cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none empty:before:italic [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800 [&_p]:m-0 [&_strong]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-2 [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-2 [&_li]:mb-1 min-h-0"
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: '"Times New Roman", Times, serif',
          textAlign: 'justify',
          textJustify: 'inter-word'
        }}
        data-placeholder={placeholderText}
        data-gramm="false"
      />
    </div>
  );
});

SmartEditor.displayName = 'SmartEditor';
