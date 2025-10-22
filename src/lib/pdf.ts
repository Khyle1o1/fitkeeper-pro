import jsPDF from 'jspdf';
import { isNative, arrayBufferToBase64, saveDataUrlNative } from './native';
import autoTable, { RowInput } from 'jspdf-autotable';

export type PdfTableColumn = {
  header: string;
  dataKey: string;
};

export type PdfExportOptions = {
  title: string;
  subtitle?: string;
  columns: PdfTableColumn[];
  rows: Array<Record<string, unknown>>;
  filename: string;
  footnote?: string;
  includeSignatures?: boolean; // when true, render three signature lines at the end
};

export async function exportTableToPdf(options: PdfExportOptions) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const marginLeft = 40;
  const marginTop = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(options.title, marginLeft, marginTop);

  let cursorY = marginTop + 20;
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const split = doc.splitTextToSize(options.subtitle, 515);
    doc.text(split, marginLeft, cursorY);
    cursorY += (Array.isArray(split) ? split.length : 1) * 14 + 6;
  }

  const head = [options.columns.map((c) => c.header)];
  const body: RowInput[] = options.rows.map((row) =>
    options.columns.map((c) => {
      const value = row[c.dataKey];
      if (value == null) return '';
      if (value instanceof Date) return value.toLocaleString();
      return String(value);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY: cursorY,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: marginLeft, right: marginLeft },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;

  if (options.footnote) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(options.footnote, marginLeft, finalY + 24);
  }

  // Optional signature section
  if (options.includeSignatures) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - marginLeft * 2;
    const colWidth = usableWidth / 3;
    const baseY = finalY + 64; // space after table/footnote

    // Draw three signature lines and labels
    for (let i = 0; i < 3; i++) {
      const x = marginLeft + i * colWidth;
      const lineY = baseY;
      doc.setDrawColor(180);
      doc.line(x, lineY, x + colWidth - 16, lineY); // signature line
      doc.setFontSize(10);
      doc.setTextColor(80);
      const label = i === 0 ? 'Prepared by' : i === 1 ? 'Checked by' : 'Approved by';
      const label2 = 'Name & Signature';
      const centerX = x + (colWidth - 16) / 2;
      doc.text(label, centerX, lineY + 14, { align: 'center' as any });
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(label2, centerX, lineY + 28, { align: 'center' as any });
    }


  }

  const finalName = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
  if (isNative()) {
    const buffer = doc.output('arraybuffer');
    const base64 = arrayBufferToBase64(buffer as ArrayBuffer);
    const dataUrl = `data:application/pdf;base64,${base64}`;
    await saveDataUrlNative(finalName, dataUrl);
  } else {
    doc.save(finalName);
  }
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type PdfExportWithLogoOptions = PdfExportOptions & {
  logoUrl?: string; // e.g. '/logo.png'
  logoWidthPx?: number; // width in pixels at 72 DPI (pt); default 48
  // Optional: tables to render BEFORE the main table (e.g., summaries)
  prependTables?: Array<{
    title?: string;
    columns: PdfTableColumn[];
    rows: Array<Record<string, unknown>>;
  }>;
};

export function getCurrentTimestamp(timeZone?: string): string {
  // Always use Manila timezone for consistency
  const tz = timeZone ?? 'Asia/Manila';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: tz,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

export async function exportTableToPdfWithLogo(options: PdfExportWithLogoOptions): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const marginLeft = 40;
  const marginTop = 48;

  let currentTop = marginTop;

  // Draw logo if available
  if (options.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(options.logoUrl);
    if (dataUrl) {
      const logoWidth = options.logoWidthPx ?? 48;
      // Center the logo horizontally. Assume square image for height.
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoX = Math.max(0, (pageWidth - logoWidth) / 2);
      doc.addImage(dataUrl, 'PNG', logoX, currentTop - 8, logoWidth, logoWidth);
      currentTop += logoWidth + 8;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(options.title, marginLeft, currentTop);

  let cursorY = currentTop + 20;
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const split = doc.splitTextToSize(options.subtitle, 515);
    doc.text(split, marginLeft, cursorY);
    cursorY += (Array.isArray(split) ? split.length : 1) * 14 + 6;
  }

  // Optional prepended tables (e.g., income summary)
  if (options.prependTables && options.prependTables.length > 0) {
    for (const tbl of options.prependTables) {
      if (tbl.title) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(tbl.title, marginLeft, cursorY);
        cursorY += 16;
      }
      const pHead = [tbl.columns.map((c) => c.header)];
      const pBody: RowInput[] = tbl.rows.map((row) =>
        tbl.columns.map((c) => {
          const value = row[c.dataKey];
          if (value == null) return '';
          if (value instanceof Date) return value.toLocaleString();
          return String(value);
        }),
      );
      autoTable(doc, {
        head: pHead,
        body: pBody,
        startY: cursorY,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: marginLeft, right: marginLeft },
        didParseCell: function (data) {
          // Highlight rows that contain "Total" in the first column
          if (data.section === 'body') {
            const firstCell = pBody[data.row.index]?.[0];
            if (typeof firstCell === 'string' && firstCell.toLowerCase().includes('total')) {
              data.cell.styles.fillColor = [225, 29, 46]; // Primary red color
              data.cell.styles.textColor = [255, 255, 255]; // White text
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 11;
            }
          }
        },
      });
      cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 12;
    }
  }

  const head = [options.columns.map((c) => c.header)];
  const body: RowInput[] = options.rows.map((row) =>
    options.columns.map((c) => {
      const value = row[c.dataKey];
      if (value == null) return '';
      if (value instanceof Date) return value.toLocaleString();
      return String(value);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY: cursorY,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: marginLeft, right: marginLeft },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;

  if (options.footnote) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(options.footnote, marginLeft, finalY + 24);
  }

  // Optional signature section
  if (options.includeSignatures) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - marginLeft * 2;
    const colWidth = usableWidth / 3;
    const baseY = finalY + 64; // space after table/footnote

    for (let i = 0; i < 3; i++) {
      const x = marginLeft + i * colWidth;
      const lineY = baseY;
      doc.setDrawColor(180);
      doc.line(x, lineY, x + colWidth - 16, lineY);
      doc.setFontSize(10);
      doc.setTextColor(80);
      const label = i === 0 ? 'Prepared by' : i === 1 ? 'Checked by' : 'Approved by';
      const label2 = 'Name & Signature';
      const centerX = x + (colWidth - 16) / 2;
      doc.text(label, centerX, lineY + 14, { align: 'center' as any });
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(label2, centerX, lineY + 28, { align: 'center' as any });
    }
  }

  const finalName = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
  if (isNative()) {
    const buffer = doc.output('arraybuffer');
    const base64 = arrayBufferToBase64(buffer as ArrayBuffer);
    const dataUrl = `data:application/pdf;base64,${base64}`;
    await saveDataUrlNative(finalName, dataUrl);
  } else {
    doc.save(finalName);
  }
}


