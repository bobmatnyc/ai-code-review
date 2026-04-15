/**
 * @fileoverview Tests for the markdown-table-to-HTML converter.
 *
 * Covers: basic tables, alignment separators, tables embedded in surrounding
 * text, empty cell values, and multiple tables in a single string.
 */

import { describe, expect, it } from 'vitest';
import { convertMarkdownTablesToHtml } from '../../formatters/utils/markdownTableToHtml';

describe('convertMarkdownTablesToHtml', () => {
  describe('basic 2-column table', () => {
    it('converts a minimal header + body table', () => {
      const input = '| Name | Value |\n|------|-------|\n| foo  | bar   |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toBe(
        '<table>' +
          '<thead><tr><th>Name</th><th>Value</th></tr></thead>' +
          '<tbody><tr><td>foo</td><td>bar</td></tr></tbody>' +
          '</table>',
      );
    });

    it('produces only thead when there are no body rows', () => {
      const input = '| A | B |\n|---|---|';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toBe(
        '<table><thead><tr><th>A</th><th>B</th></tr></thead></table>',
      );
    });

    it('handles multiple body rows', () => {
      const input = '| X |\n|---|\n| 1 |\n| 2 |\n| 3 |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toBe(
        '<table>' +
          '<thead><tr><th>X</th></tr></thead>' +
          '<tbody><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></tbody>' +
          '</table>',
      );
    });
  });

  describe('alignment separators', () => {
    it('handles left-aligned separator (:---)', () => {
      const input = '| Col |\n|:----|\n| val |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<th>Col</th>');
      expect(result).toContain('<td>val</td>');
    });

    it('handles right-aligned separator (---:)', () => {
      const input = '| Price |\n|------:|\n| 9.99  |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<th>Price</th>');
      expect(result).toContain('<td>9.99</td>');
    });

    it('handles center-aligned separator (:---:)', () => {
      const input = '| Center |\n|:------:|\n| value  |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<th>Center</th>');
      expect(result).toContain('<td>value</td>');
    });

    it('handles mixed alignment in multi-column table', () => {
      const input = '| Left | Right | Center |\n|:-----|------:|:------:|\n| a | b | c |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<th>Left</th>');
      expect(result).toContain('<th>Right</th>');
      expect(result).toContain('<th>Center</th>');
      expect(result).toContain('<td>a</td>');
      expect(result).toContain('<td>b</td>');
      expect(result).toContain('<td>c</td>');
    });
  });

  describe('table embedded mid-document', () => {
    it('leaves non-table content before the table unchanged', () => {
      const input = 'Some intro text.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nTrailing paragraph.';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('Some intro text.');
      expect(result).toContain('Trailing paragraph.');
      expect(result).toContain('<table>');
      expect(result).not.toContain('| A | B |');
    });

    it('preserves content on lines immediately adjacent to a table', () => {
      const input = 'Before\n| H |\n|---|\n| v |\nAfter';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toBe('Before\n<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>v</td></tr></tbody></table>\nAfter');
    });

    it('does not convert pipe characters that are not table rows', () => {
      const input = 'Use `|` to separate columns.';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toBe('Use `|` to separate columns.');
    });
  });

  describe('empty cell values', () => {
    it('preserves empty header cells as empty <th> elements', () => {
      const input = '|  | B |\n|---|---|\n| 1 | 2 |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<th></th>');
      expect(result).toContain('<th>B</th>');
    });

    it('preserves empty body cells as empty <td> elements', () => {
      const input = '| A | B |\n|---|---|\n|   | 2 |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<td></td>');
      expect(result).toContain('<td>2</td>');
    });
  });

  describe('multiple tables in one string', () => {
    it('converts both tables independently', () => {
      const table1 = '| T1 |\n|----|\n| r1 |';
      const table2 = '| T2 |\n|----|\n| r2 |';
      const input = `${table1}\n\nInterlude\n\n${table2}`;
      const result = convertMarkdownTablesToHtml(input);

      const tableCount = (result.match(/<table>/g) || []).length;
      expect(tableCount).toBe(2);
      expect(result).toContain('<th>T1</th>');
      expect(result).toContain('<th>T2</th>');
      expect(result).toContain('<td>r1</td>');
      expect(result).toContain('<td>r2</td>');
      expect(result).toContain('Interlude');
    });

    it('converts adjacent tables separated by a blank line', () => {
      const input = '| A |\n|---|\n| 1 |\n\n| B |\n|---|\n| 2 |';
      const result = convertMarkdownTablesToHtml(input);
      expect((result.match(/<table>/g) || []).length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('returns an empty string unchanged', () => {
      expect(convertMarkdownTablesToHtml('')).toBe('');
    });

    it('returns plain text unchanged', () => {
      const text = 'No tables here.\nJust plain text.';
      expect(convertMarkdownTablesToHtml(text)).toBe(text);
    });

    it('trims whitespace from cell content', () => {
      const input = '|  padded  |  value  |\n|----------|----------|\n|  a  |  b  |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).toContain('<th>padded</th>');
      expect(result).toContain('<th>value</th>');
      expect(result).toContain('<td>a</td>');
      expect(result).toContain('<td>b</td>');
    });

    it('does not add inline styles to output', () => {
      const input = '| Col |\n|-----|\n| val |';
      const result = convertMarkdownTablesToHtml(input);
      expect(result).not.toContain('style=');
    });
  });
});
