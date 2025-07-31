/**
 * Terminal output sanitizer for Ink compatibility
 * 
 * Handles terminal escape sequences that break Ink rendering:
 * - Converts cursor positioning to spaces where appropriate
 * - Strips screen control sequences entirely
 * - Preserves ANSI colors and other supported sequences
 */

export function sanitizeTerminalOutput(output: string): string {
  let sanitized = output;
  
  // Convert cursor forward positioning to spaces (preserve layout)
  sanitized = sanitized.replace(/\u001b\[(\d+)C/g, (_, digits) => {
    const spaces = parseInt(digits, 10);
    return ' '.repeat(spaces);
  });
  
  // Strip cursor movement sequences (up, down, left)
  sanitized = sanitized.replace(/\u001b\[(\d+)[ABD]/g, '');
  
  // Strip cursor positioning sequences
  sanitized = sanitized.replace(/\u001b\[(\d+);(\d+)H/g, ''); // Row;Col positioning
  sanitized = sanitized.replace(/\u001b\[H/g, ''); // Home position
  
  // Strip screen control sequences
  sanitized = sanitized.replace(/\u001b\[\?1049h/g, ''); // Alternate screen buffer
  sanitized = sanitized.replace(/\u001b\[2J/g, ''); // Clear entire screen
  sanitized = sanitized.replace(/\u001b\[\?25[lh]/g, ''); // Show/hide cursor
  
  // Strip other problematic vim sequences
  sanitized = sanitized.replace(/\u001b\[\?[0-9;]*[hlm]/g, ''); // Various mode switches
  sanitized = sanitized.replace(/\u001b\[[0-9;]*[tT]/g, ''); // Window title operations
  
  return sanitized;
}