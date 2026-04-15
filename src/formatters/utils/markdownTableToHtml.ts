/**
 * @fileoverview Converts GFM markdown table blocks to HTML table elements.
 *
 * This utility detects GitHub Flavored Markdown (GFM) table blocks in a string
 * and replaces each one with a semantic HTML <table> element. All other markdown
 * content is left untouched so callers can apply additional rendering as needed.
 *
 * A GFM table consists of:
 *   1. A header row:    `| col | col |`
 *   2. A separator row: `| --- | --- |` (optional colons for alignment)
 *   3. Zero or more body rows: `| val | val |`
 *
 * The implementation is regex-based with no additional npm dependencies.
 */

/**
 * Split a GFM table row string into trimmed cell values.
 * Leading/trailing `|` delimiters are stripped before splitting.
 *
 * @param row - A single table row string, e.g. `| foo | bar |`
 * @returns Array of trimmed cell content strings.
 */
function splitRow(row: string): string[] {
  // Remove leading and trailing pipe characters, then split on remaining pipes
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Determine whether a row is a GFM separator row.
 * Separator cells consist only of optional colons, dashes, and whitespace.
 *
 * @param row - A single table row string.
 * @returns `true` if every cell matches the separator pattern.
 */
function isSeparatorRow(row: string): boolean {
  const cells = splitRow(row);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

/**
 * Build an HTML row string from an array of cell values.
 *
 * @param cells - Trimmed cell content strings.
 * @param tag - Either `'th'` (header) or `'td'` (data).
 * @returns A complete `<tr>...</tr>` HTML string.
 */
function buildHtmlRow(cells: string[], tag: 'th' | 'td'): string {
  const cellsHtml = cells.map((cell) => `<${tag}>${cell}</${tag}>`).join('');
  return `<tr>${cellsHtml}</tr>`;
}

/**
 * Convert a matched GFM table block (as an array of row strings) to an HTML
 * `<table>` element string.
 *
 * @param rows - Non-empty array of raw table row strings.
 * @returns Rendered HTML table string.
 */
function tableBlockToHtml(rows: string[]): string {
  if (rows.length < 2) {
    // Not enough rows for a valid GFM table (need header + separator at minimum)
    return rows.join('\n');
  }

  const headerRow = rows[0];
  // rows[1] is the separator — skip it
  const bodyRows = rows.slice(2);

  const headerCells = splitRow(headerRow);
  const theadHtml = `<thead>${buildHtmlRow(headerCells, 'th')}</thead>`;

  let tbodyHtml = '';
  if (bodyRows.length > 0) {
    const bodyRowsHtml = bodyRows.map((row) => buildHtmlRow(splitRow(row), 'td')).join('');
    tbodyHtml = `<tbody>${bodyRowsHtml}</tbody>`;
  }

  return `<table>${theadHtml}${tbodyHtml}</table>`;
}

/**
 * Converts GFM markdown table blocks in a string to HTML `<table>` elements.
 *
 * Each contiguous group of lines starting with `|` that contains a valid
 * separator row in the second position is treated as a table block. All other
 * content is left unchanged.
 *
 * @param markdown - Input string that may contain GFM table syntax.
 * @returns String with markdown table blocks replaced by HTML tables.
 *
 * @example
 * ```ts
 * const md = '| A | B |\n|---|---|\n| 1 | 2 |';
 * convertMarkdownTablesToHtml(md);
 * // => '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
 * ```
 */
export function convertMarkdownTablesToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const outputLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // A table block starts with a line that begins with `|`
    if (line.trimStart().startsWith('|')) {
      // Collect all consecutive pipe-starting lines as a candidate block
      const blockLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trimStart().startsWith('|')) {
        blockLines.push(lines[j]);
        j++;
      }

      // Validate: must have at least 2 rows and the second row must be a separator
      if (blockLines.length >= 2 && isSeparatorRow(blockLines[1])) {
        outputLines.push(tableBlockToHtml(blockLines));
        i = j;
      } else {
        // Not a valid table — emit as-is
        outputLines.push(line);
        i++;
      }
    } else {
      outputLines.push(line);
      i++;
    }
  }

  return outputLines.join('\n');
}
