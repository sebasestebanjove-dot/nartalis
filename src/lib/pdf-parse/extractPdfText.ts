if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: string | DOMMatrixPolyfill | number[]) {}
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    inverse() { return new DOMMatrixPolyfill(); }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill as any;
}

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as path from 'path';

let workerInitialized = false;

export function ensureWorker(): void {
  if (!workerInitialized) {
    let workerPath = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
    if (process.platform === 'win32') {
      workerPath = 'file:///' + workerPath.replace(/\\/g, '/');
    }
    GlobalWorkerOptions.workerSrc = workerPath;
    workerInitialized = true;
  }
}

export interface PdfJsPageContent {
  pageNumber: number;
  text: string;
  charCount: number;
  items: any[];
}

export interface PdfJsExtractionResult {
  pageTexts: string[];
  fullText: string;
  pageCount: number;
  totalChars: number;
  pages: PdfJsPageContent[];
}

export async function extractPdfTextFromBuffer(
  buffer: Buffer | Uint8Array,
  options?: { maxPages?: number }
): Promise<PdfJsExtractionResult> {
  ensureWorker();

  const maxPages = options?.maxPages;
  const uint8Array = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const loadingTask = getDocument({
    data: uint8Array,
    verbosity: 0,
    disableAutoFetch: true,
    disableStream: true,
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = maxPages ? Math.min(pdfDocument.numPages, maxPages) : pdfDocument.numPages;

  const pages: PdfJsPageContent[] = [];
  let fullText = '';
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageItems = textContent.items as any[];
    const pageText = pageItems
      .filter((item): item is { str: string; transform: number[] } => 
        item && typeof item.str === 'string' && item.str.trim().length > 0
      )
      .sort((a, b) => {
        const ay = a.transform[5] || 0;
        const by = b.transform[5] || 0;
        const ax = a.transform[4] || 0;
        const bx = b.transform[4] || 0;
        if (Math.abs(ay - by) > 5) return by - ay;
        return ax - bx;
      })
      .map(item => item.str)
      .join(' ');

    const cleanText = pageText.replace(/\s+/g, ' ').trim();
    const charCount = cleanText.length;

    pages.push({
      pageNumber: pageNum,
      text: cleanText,
      charCount,
      items: textContent.items,
    });

    fullText += cleanText + '\n\n';
    totalChars += charCount;
  }

  await pdfDocument.destroy();

  return {
    pageTexts: pages.map(p => p.text),
    fullText: fullText.trim(),
    pageCount: numPages,
    totalChars,
    pages,
  };
}

export async function extractPdfTextFromFile(
  filePath: string,
  options?: { maxPages?: number }
): Promise<PdfJsExtractionResult> {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  return extractPdfTextFromBuffer(buffer, options);
}

export function calculatePdfHash(buffer: Buffer | Uint8Array): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}