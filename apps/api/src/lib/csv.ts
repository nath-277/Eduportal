export interface CsvRow {
  [key: string]: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === ',') {
      out.push(current);
      current = '';
    } else if (ch === '"') {
      inQuotes = true;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((v) => v.trim());
}

export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0] as string).map((h) => h.toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i] as string);
    const row: CsvRow = {};
    for (let j = 0; j < header.length; j += 1) {
      row[header[j] as string] = cols[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}
