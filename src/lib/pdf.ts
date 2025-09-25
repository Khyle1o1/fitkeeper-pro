import jsPDF from 'jspdf';
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
};

export function exportTableToPdf(options: PdfExportOptions) {
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

  if (options.footnote) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(options.footnote, marginLeft, finalY + 24);
  }

  doc.save(options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`);
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

  if (options.footnote) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(options.footnote, marginLeft, finalY + 24);
  }

  doc.save(options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`);
}


