// CSV pour Excel (France/Afrique francophone) : séparateur « ; », BOM UTF-8, fins de ligne CRLF.
// Les cellules commençant par = + - @ sont neutralisées (injection de formule à l'ouverture dans Excel).
const cell = (value: unknown) => {
  let v = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
