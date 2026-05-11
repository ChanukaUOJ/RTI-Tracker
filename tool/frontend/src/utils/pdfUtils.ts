import jsPDF from 'jspdf';
import { Sender, Receiver } from '../types/db';
import { replaceVariables } from './variableUtils';

interface PDFData {
  title: string;
  requestDate: string;
  sender: Sender | undefined;
  receiver: Receiver | undefined;
  content: string;
}

export const generateRTIPDF = async (data: PDFData): Promise<{ blob: Blob; fileName: string; finalMarkdown: string }> => {
  const { title, requestDate, sender, receiver, content: rawContent } = data;

  const finalMarkdown = replaceVariables(rawContent, requestDate, sender, receiver);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 25;
  const contentWidth = 160;
  let cursorY = 25;


  // Helper to render text with markdown support (bold, italic, underline)
  const renderRichText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5, initialBold: boolean = false): number => {
    const tokens: { text: string; style: string; underline: boolean }[] = [];

    // Split by all possible markdown markers, preserving them
    const segments = text.split(/(<u>|<\/u>|\*\*\*|___|\*\*|__|\*|_)/);

    let isBold = initialBold;
    let isItalic = false;
    let isUnderline = false;

    segments.forEach(seg => {
      if (seg === '<u>') {
        isUnderline = true;
      } else if (seg === '</u>') {
        isUnderline = false;
      } else if (seg === '***' || seg === '___') {
        isBold = !isBold;
        isItalic = !isItalic;
      } else if (seg === '**' || seg === '__') {
        isBold = !isBold;
      } else if (seg === '*' || seg === '_') {
        isItalic = !isItalic;
      } else if (seg) {
        let style = 'normal';
        if (isBold && isItalic) style = 'bolditalic';
        else if (isBold) style = 'bold';
        else if (isItalic) style = 'italic';

        tokens.push({ text: seg, style, underline: isUnderline });
      }
    });

    let currentX = x;
    let currentY = y;

    tokens.forEach(token => {
      doc.setFont('times', token.style);

      const words = token.text.split(/(\s+)/);
      words.forEach(word => {
        if (word === '') return;
        const safeWord = word.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');
        const wordWidth = doc.getTextWidth(safeWord);

        if (currentX + wordWidth > x + maxWidth && safeWord.trim().length > 0) {
          currentX = x;
          currentY += lineHeight;
          if (currentY > 270) {
            doc.addPage();
            currentY = 25;
            doc.setFont('times', token.style);
          }
        }

        doc.text(safeWord, currentX, currentY);
        
        if (token.underline) {
          doc.setLineWidth(0.2);
          doc.line(currentX, currentY + 0.5, currentX + wordWidth, currentY + 0.5);
        }

        currentX += wordWidth;
      });
    });

    return currentY;
  };

  const lines = finalMarkdown.split('\n');
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      cursorY += 6;
      return;
    }

    if (cursorY > 270) {
      doc.addPage();
      cursorY = 25;
    }

    if (line.startsWith('#')) {
      const level = line.startsWith('##') ? 2 : 1;
      const title = line.replace(/^#+\s*/, '');
      
      doc.setFontSize(level === 1 ? 16 : 14);
      // Headings are bold by default (initialBold = true)
      cursorY = renderRichText(title, margin, cursorY, contentWidth, 7, true);
      cursorY += 4; // Extra space after headings
    } else {
      // Check for numbered list items (1. item, 2. item)
      const olMatch = line.match(/^(\d+)\.\s+(.*)/);
      // Check for bulleted list items (- item)
      const ulMatch = line.match(/^-\s+(.*)/);

      if (olMatch) {
        doc.setFontSize(11);
        const listIndent = margin + 8;
        const listContentWidth = contentWidth - 8;
        // Render the number
        doc.setFont('times', 'normal');
        doc.text(`${olMatch[1]}.`, margin, cursorY);
        // Render the list item content
        cursorY = renderRichText(olMatch[2], listIndent, cursorY, listContentWidth, 5, false);
        cursorY += 4;
      } else if (ulMatch) {
        doc.setFontSize(11);
        const listIndent = margin + 8;
        const listContentWidth = contentWidth - 8;
        // Render the bullet
        doc.setFont('times', 'normal');
        doc.text('•', margin + 2, cursorY);
        // Render the list item content
        cursorY = renderRichText(ulMatch[1], listIndent, cursorY, listContentWidth, 5, false);
        cursorY += 4;
      } else {
        doc.setFontSize(11);
        cursorY = renderRichText(line.trim(), margin, cursorY, contentWidth, 5, false);
        cursorY += 6; // Paragraph spacing
      }
    }
  });

  const blob = doc.output('blob');
  const fileName = `${(title || 'rti_request').replace(/\s+/g, '_')}.pdf`;

  return { blob, fileName, finalMarkdown };
};

/**
 * Triggers a browser download for a given Blob.
 * Handles object URL creation and cleanup automatically.
 */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
