// lib/pdf/playwright.ts
// Playwright PDF driver for production VPS (§4.1, §11)
import type { PdfDriver } from './index';

export const playwrightDriver: PdfDriver = {
  async renderHtmlToPdf(html: string): Promise<Buffer> {
    // Dynamically require playwright on VPS
    try {
      const playwrightPkg = 'playwright';
      const { chromium } = await import(/* webpackIgnore: true */ playwrightPkg);
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      });
      await browser.close();
      return pdf;
    } catch (err) {
      console.warn('[PlaywrightDriver] Fallback to HTML buffer:', err);
      return Buffer.from(html, 'utf-8');
    }
  },
};
