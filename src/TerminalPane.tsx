import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Text, useInput, Box } from 'ink';
import pty from 'node-pty';
import xtermHeadless from '@xterm/headless';
import addonSerialize from '@xterm/addon-serialize';
import { grayScale, blueScale } from './colors.js';
import { sanitizeTerminalOutput } from './terminal-sanitizer.js';
import * as fs from 'fs/promises';

const { Terminal } = xtermHeadless;
const { SerializeAddon } = addonSerialize;

interface TerminalPaneProps {
  isSelected: boolean;
  height: number;
  totalCols: number;
}

const TerminalPane = ({ isSelected, height, totalCols }: TerminalPaneProps) => {
  // Use passed-in dimensions instead of computing them
  const cols = totalCols;
  const rows = height;
  
  // Internal flash error state
  const [flashError, setFlashError] = useState(false);
  const term = useRef(new Terminal({ 
    cols: Math.floor(cols / 2) - 4, 
    rows: rows - 2, // Account for border and padding
    allowProposedApi: true 
  }));
  const serializer = useRef(new SerializeAddon());
  const [frame, setFrame] = useState('');
  const ptyRef = useRef<pty.IPty | null>(null);

  // Memoize border color to prevent unnecessary layout changes
  const borderColor = useMemo(() => {
    return flashError && isSelected ? 'red' : 
           isSelected ? blueScale.base : grayScale.light;
  }, [flashError, isSelected]);

  // Initial mount
  useEffect(() => {
    // Clear debug logs
    fs.writeFile('./xterm-debug.log', 'XTERM DEBUG LOG\n=================\n').catch(console.error);
    
    const termCols = Math.floor(cols / 2) - 4;
    const termRows = rows - 2; // Account for border and padding
    
    fs.appendFile('./xterm-debug.log', `Initial setup: cols=${termCols}, rows=${termRows}\n`).catch(console.error);
    
    term.current.loadAddon(serializer.current);
    ptyRef.current = pty.spawn('zsh', [], {
      name: 'xterm-256color',
      cols: termCols,
      rows: termRows,
    });

    fs.appendFile('./xterm-debug.log', `PTY spawned successfully\n`).catch(console.error);

    // Pipe PTY → xterm
    ptyRef.current.onData(data => {
      fs.appendFile('./xterm-debug.log', `PTY DATA: ${JSON.stringify(data)}\n`).catch(console.error);
      
      term.current.write(data);
      
      // Use setTimeout to ensure xterm has processed the data before serializing
      setTimeout(() => {
        try {
          const serialized = serializer.current.serialize();
          const sanitized = sanitizeTerminalOutput(serialized);
          fs.appendFile('./xterm-debug.log', `SERIALIZED LENGTH: ${serialized.length}\n`).catch(console.error);
          fs.appendFile('./xterm-debug.log', `SERIALIZED CONTENT: ${JSON.stringify(serialized)}\n`).catch(console.error);
          setFrame(sanitized);
        } catch (error) {
          fs.appendFile('./xterm-debug.log', `SERIALIZE ERROR: ${error}\n`).catch(console.error);
          setFrame('SERIALIZE ERROR');
        }
      }, 0);
    });

    // Cleanup
    return () => ptyRef.current?.kill();
  }, []);

  // Window resize
  useEffect(() => {
    const termCols = Math.floor(cols / 2) - 4;
    const termRows = rows - 2; // Account for border and padding
    term.current.resize(termCols, termRows);
    ptyRef.current?.resize(termCols, termRows);
  }, [cols, rows]);

  // Keystrokes when this pane is selected
  useInput((input, key) => {
    if (!isSelected || !ptyRef.current) return;

    fs.appendFile('./xterm-debug.log', `INPUT: ${JSON.stringify({input, key})}\n`).catch(console.error);

    // Handle flash error for unsupported arrow keys
    if (key.leftArrow || key.rightArrow) {
      setFlashError(true);
      setTimeout(() => setFlashError(false), 200);
      return; // Don't send arrow keys to terminal
    }

    if (key.return) ptyRef.current.write('\r');
    else if (key.tab) ptyRef.current.write('\t');
    else if (key.backspace || key.delete) ptyRef.current.write('\x7f');
    else if (input) ptyRef.current.write(input);
  });

  // Log current frame for debugging
  useEffect(() => {
    fs.appendFile('./xterm-debug.log', `RENDER FRAME LENGTH: ${frame.length}\n`).catch(console.error);
    if (frame.length < 200) {
      fs.appendFile('./xterm-debug.log', `RENDER FRAME: ${JSON.stringify(frame)}\n`).catch(console.error);
    }
  }, [frame]);

  // Memoize the terminal content to prevent unnecessary re-renders
  const memoizedContent = useMemo(() => {
    return <Text>{frame}</Text>;
  }, [frame]);

  return (
    <Box 
      width="50%" 
      height={height}
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      padding={1}
      overflow="hidden"
    >
      {memoizedContent}
    </Box>
  );
};

export default React.memo(TerminalPane);