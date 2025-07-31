/**
 * Terminal output sanitization utilities for Ink display
 * Removes problematic control characters while preserving ANSI colors
 */

export function sanitizeTerminalOutput(data: string, previousOutput: string = ''): { cleanData: string, newOutput: string } {
  let cleanData = data;
  
  // Remove cursor positioning, clearing, and mode changes (but keep colors)
  // cleanData = cleanData.replace(/\x1b\[[HfABCDsu]/g, ''); // cursor movement
  cleanData = cleanData.replace(/\x1b\[[0-9]*[JK]/g, ''); // clear screen/line  
  cleanData = cleanData.replace(/\x1b\[\?[0-9]+[hl]/g, ''); // mode changes
  
  // Handle complex zsh prompt sequences
  // Remove sequences like: \x1b[1m\x1b[7m%\x1b[m\x1b[1m\x1b[m + spaces + \r \r
  cleanData = cleanData.replace(/\x1b\[1m\x1b\[7m%\x1b\[m\x1b\[1m\x1b\[m\s*\r \r/g, '');
  
  // Remove backspace-space-backspace sequences used for deletion
  // cleanData = cleanData.replace(/\b \b/g, '');
  
  // Fix line endings: handle \r\r\n and \r\n patterns first, then standalone \r
  cleanData = cleanData.replace(/\r\r\n/g, '\n'); // \r\r\n -> \n
  cleanData = cleanData.replace(/\r\n/g, '\n');   // \r\n -> \n  
  cleanData = cleanData.replace(/\r/g, '');       // standalone \r -> nothing
  
  // Remove remaining control characters except \n, \t, and ANSI sequences (but keep \b for now)
  cleanData = cleanData.replace(/[\x00-\x07\x0B\x0C\x0E-\x1A\x1C-\x1F\x7F]/g, '');
  
  // Handle backspaces across chunks - work with combined output
  let combinedOutput = previousOutput + cleanData;
  
  // Process backspaces against the full context
  while (combinedOutput.includes('\b')) {
    // Find backspace and remove the character before it
    const backspaceIndex = combinedOutput.indexOf('\b');
    if (backspaceIndex > 0) {
      // Remove the character before backspace and the backspace itself
      combinedOutput = combinedOutput.slice(0, backspaceIndex - 1) + combinedOutput.slice(backspaceIndex + 1);
    } else {
      // Backspace at start - just remove it
      combinedOutput = combinedOutput.slice(1);
    }
  }
  
  return { 
    cleanData: combinedOutput.slice(previousOutput.length), 
    newOutput: combinedOutput 
  };
}

export function limitOutputLines(output: string, maxLines: number = 1000): string {
  const lines = output.split('\n');
  if (lines.length > maxLines) {
    return lines.slice(-maxLines).join('\n');
  }
  return output;
}