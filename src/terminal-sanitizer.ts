/**
 * Minimal terminal output sanitizer for Ink compatibility
 * 
 * Converts cursor positioning sequences to equivalent spaces to maintain
 * formatting while ensuring Ink compatibility.
 * 
 * Specifically converts: \u001b[<number>C (cursor forward positioning)
 * Example: "\u001b[15C" becomes "               " (15 spaces)
 */

export function sanitizeTerminalOutput(output: string): string {
  // Convert cursor forward positioning sequences to equivalent spaces
  return output.replace(/\u001b\[(\d+)C/g, (_, digits) => {
    const spaces = parseInt(digits, 10);
    return ' '.repeat(spaces);
  });
}