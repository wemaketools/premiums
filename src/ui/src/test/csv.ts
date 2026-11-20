/** Test helpers for the CSV exports: capture the file a click downloads and read it back as rows. */
import { vi } from 'vitest';

import { restoreAfterEach } from './restoreAfterEach';

export interface DownloadedFile {
  readonly name: string;
  readonly text: string;
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Records every file the page hands to the browser as a download (jsdom has no download of its own). */
export function captureDownloads(): { readonly next: () => Promise<DownloadedFile> } {
  const blobs = new Map<string, Blob>();
  const files: Promise<DownloadedFile>[] = [];
  let counter = 0;
  const define = (name: 'createObjectURL' | 'revokeObjectURL', value: unknown): void => {
    const original = Object.getOwnPropertyDescriptor(URL, name);
    Object.defineProperty(URL, name, { configurable: true, writable: true, value });
    restoreAfterEach(() => {
      if (original === undefined) Reflect.deleteProperty(URL, name);
      else Object.defineProperty(URL, name, original);
    });
  };
  define('createObjectURL', (blob: Blob) => {
    counter += 1;
    const url = `blob:test/${counter}`;
    blobs.set(url, blob);
    return url;
  });
  define('revokeObjectURL', () => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href);
    if (blob !== undefined) {
      files.push(readBlob(blob).then((text) => ({ name: this.download, text })));
    }
  });
  let read = 0;
  return {
    next: async () => {
      const file = files[read];
      read += 1;
      if (file === undefined) throw new Error('No file was downloaded.');
      return file;
    },
  };
}

/** The rows of CSV text (RFC 4180: quoted cells, doubled quotes, CRLF), without the empty last line. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"' && text.charAt(index + 1) === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text.charAt(index + 1) === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
