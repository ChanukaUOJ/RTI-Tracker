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

  const margin = 19;
  const contentWidth = 170
  let cursorY = 30;

  interface RenderState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: 'left' | 'center' | 'right' | 'justify';
  }

  // Helper to render text with markdown support (bold, italic, underline, alignment)
  const renderRichText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 5,
    initialState: RenderState
  ): { endY: number; hasRenderedText: boolean; state: RenderState } => {
    const tokens: { text: string; style: string; underline: boolean }[] = [];

    // Split by all possible markdown markers, preserving them
    const segments = text.split(/(<u>|<\/u>|\*\*\*|___|\*\*|__|\*|_)/);

    let { bold: isBold, italic: isItalic, underline: isUnderline, align: currentAlign } = initialState;
    let hasRenderedText = false;

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
        if (seg.trim().length > 0) hasRenderedText = true;
      }
    });

    let currentY = y;

    // Group tokens into lines based on maxWidth
    const lines: { tokens: any[]; width: number }[] = [];
    let currentLine: any[] = [];
    let currentLineWidth = 0;

    tokens.forEach(token => {
      doc.setFont('times', token.style);
      const words = token.text.split(/(\s+)/);

      words.forEach(word => {
        if (word === '') return;
        const safeWord = word.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');
        const wordWidth = doc.getTextWidth(safeWord);

        if (currentLineWidth + wordWidth > maxWidth && safeWord.trim().length > 0) {
          lines.push({ tokens: currentLine, width: currentLineWidth });
          currentLine = [];
          currentLineWidth = 0;
        }

        currentLine.push({ ...token, text: safeWord, width: wordWidth });
        currentLineWidth += wordWidth;
      });
    });

    if (currentLine.length > 0) {
      lines.push({ tokens: currentLine, width: currentLineWidth });
    }

    // Render lines with alignment
    lines.forEach((line, index) => {
      let startX = x;
      if (currentAlign === 'center') {
        startX = x + (maxWidth - line.width) / 2;
      } else if (currentAlign === 'right') {
        startX = x + (maxWidth - line.width);
      }

      let drawX = startX;
      line.tokens.forEach(token => {
        doc.setFont('times', token.style);
        doc.text(token.text, drawX, currentY);

        if (token.underline) {
          doc.setLineWidth(0.2);
          doc.line(drawX, currentY + 0.5, drawX + token.width, currentY + 0.5);
        }
        drawX += token.width;
      });

      if (index < lines.length - 1) {
        currentY += lineHeight;
        if (currentY > 270) {
          doc.addPage();
          currentY = 30;
        }
      }
    });

    return {
      endY: currentY,
      hasRenderedText,
      state: { bold: isBold, italic: isItalic, underline: isUnderline, align: currentAlign }
    };
  };

  const lines = finalMarkdown.split('\n');
  let currentState: RenderState = { bold: false, italic: false, underline: false, align: 'left' };
  let activeAlign: 'left' | 'center' | 'right' | 'justify' = 'left';

  lines.forEach(line => {
    let trimmedLine = line.trim();

    // Detect opening alignment tag
    const openMatch = trimmedLine.match(/<div style="text-align: (.*?)">/);
    if (openMatch) {
      activeAlign = openMatch[1] as any;
      trimmedLine = trimmedLine.replace(/<div style="text-align: (.*?)">/, '');
    }

    // Detect closing alignment tag
    const hasClosingTag = trimmedLine.includes('</div>');
    if (hasClosingTag) {
      trimmedLine = trimmedLine.replace('</div>', '');
    }

    const isLineEmpty = trimmedLine === '';

    if (isLineEmpty) {
      // Only add spacing if we didn't just consume a tag on an otherwise empty line
      if (!openMatch && !hasClosingTag) {
        cursorY += 6;
      }
      if (hasClosingTag) activeAlign = 'left';
      return;
    }

    if (cursorY > 270) {
      doc.addPage();
      cursorY = 30;
    }

    if (trimmedLine.startsWith('#')) {
      const level = trimmedLine.startsWith('##') ? 2 : 1;
      const title = trimmedLine.replace(/^#+\s*/, '');

      doc.setFontSize(level === 1 ? 16 : 14);
      const result = renderRichText(title, margin, cursorY, contentWidth, 7, { ...currentState, bold: true, align: activeAlign });
      cursorY = result.endY;
      cursorY += 4;
    } else {
      const olMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
      const ulMatch = trimmedLine.match(/^-\s+(.*)/);

      if (olMatch) {
        doc.setFontSize(11);
        const listIndent = margin + 8;
        const listContentWidth = contentWidth - 8;
        doc.setFont('times', 'normal');
        doc.text(`${olMatch[1]}.`, margin, cursorY);
        const result = renderRichText(olMatch[2], listIndent, cursorY, listContentWidth, 5, { ...currentState, align: activeAlign });
        cursorY = result.endY;
        cursorY += 4;
      } else if (ulMatch) {
        doc.setFontSize(11);
        const listIndent = margin + 8;
        const listContentWidth = contentWidth - 8;
        doc.setFont('times', 'normal');
        doc.text('•', margin + 2, cursorY);
        const result = renderRichText(ulMatch[1], listIndent, cursorY, listContentWidth, 5, { ...currentState, align: activeAlign });
        cursorY = result.endY;
        cursorY += 4;
      } else {
        doc.setFontSize(11);
        const result = renderRichText(trimmedLine, margin, cursorY, contentWidth, 5, { ...currentState, align: activeAlign });
        cursorY = result.endY;

        if (result.hasRenderedText) {
          cursorY += 6;
        }
      }
    }

    // Reset alignment after the line if we found a closing tag on this line
    if (hasClosingTag) {
      activeAlign = 'left';
    }
  });

  // Add Header and Footer to all pages
  const addHeaderFooter = async (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 19;

    // Load logo
    const logoData = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.src = '/logo_header.png';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
    });

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // --- Header ---
      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, 5, 45, 15);
      }

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, 20, pageWidth - margin, 20);

      // Footer
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.setFont('helvetica', 'normal');
      const footerText = '';
      doc.text(footerText, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
  };

  await addHeaderFooter(doc);

  const blob = doc.output('blob');
  const fileName = `${(title || 'rti_request').replace(/\s+/g, '_')}.pdf`;

  return { blob, fileName, finalMarkdown };
};

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
