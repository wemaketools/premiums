/** A small RFC 4180 reader: quoted cells, doubled quotes, commas and line breaks inside quotes, CRLF, a BOM. */

export interface CsvRow {
  readonly line: number;
  readonly cells: readonly string[];
}

export interface CsvTable {
  readonly header: readonly string[];
  readonly rows: readonly CsvRow[];
}

export function parseCsv(input: string): CsvTable {
  const text = input.startsWith('﻿') ? input.slice(1) : input;
  const records: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  let touched = false;

  const endCell = (): void => {
    cells.push(cell);
    cell = '';
  };
  const endRecord = (): void => {
    endCell();
    if (touched || cells.length > 1 || cells[0] !== '') {
      records.push({ line: recordLine, cells });
    }
    cells = [];
    touched = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (text.charAt(index + 1) === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        if (char === '\n') line += 1;
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell === '') {
      quoted = true;
      touched = true;
    } else if (char === ',') {
      endCell();
      touched = true;
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text.charAt(index + 1) === '\n') index += 1;
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      cell += char;
      touched = true;
    }
  }
  if (cell !== '' || cells.length > 0 || touched) {
    endRecord();
  }

  const [headerRow, ...rows] = records;
  return { header: headerRow === undefined ? [] : headerRow.cells.map((name) => name.trim()), rows };
}
