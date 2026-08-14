// lib/pdf/index.ts
// PDF driver interface (§4.3, §11)
import { env } from '@/lib/env';

export interface PdfDriver {
  renderHtmlToPdf(html: string): Promise<Buffer>;
}

export function getPdfDriver(): PdfDriver {
  switch (env.PDF_DRIVER) {
    case 'playwright': {
      const { playwrightDriver } = require('./playwright');
      return playwrightDriver;
    }
    case 'html-print': {
      const { htmlPrintDriver } = require('./html-print');
      return htmlPrintDriver;
    }
    default:
      throw new Error(`Unsupported PDF_DRIVER: ${env.PDF_DRIVER}`);
  }
}
