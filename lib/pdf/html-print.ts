// lib/pdf/html-print.ts
// HTML Print view driver for Vercel demo environment (§4.2, §11)
import type { PdfDriver } from './index';

export const htmlPrintDriver: PdfDriver = {
  async renderHtmlToPdf(html: string): Promise<Buffer> {
    // In demo environment, PDF is rendered as HTML print view in browser
    // Return Buffer of the HTML template directly
    return Buffer.from(html, 'utf-8');
  },
};
