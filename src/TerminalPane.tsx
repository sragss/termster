import React, { useEffect, useRef, useState } from 'react';
import { Text, useInput, useStdout, Box } from 'ink';
import pty from 'node-pty';
import xtermHeadless from '@xterm/headless';
import addonSerialize from '@xterm/addon-serialize';
import { grayScale, blueScale } from './colors.js';
import * as fs from 'fs';

const { Terminal } = xtermHeadless;
const { SerializeAddon } = addonSerialize;

interface TerminalPaneProps {
  isSelected: boolean;
  flashError: boolean;
}

const TerminalPane = ({ isSelected, flashError }: TerminalPaneProps) => {
  const { stdout } = useStdout();
  const cols = stdout.columns || 80;
  const rows = stdout.rows || 24;
  const term = useRef(new Terminal({ 
    cols: Math.floor(cols / 2) - 4, 
    rows: rows - 6,
    allowProposedApi: true 
  }));
  const serializer = useRef(new SerializeAddon());
  const [frame, setFrame] = useState('');
  const ptyRef = useRef<pty.IPty | null>(null);

  // Simple border color calculation
  const borderColor = flashError && isSelected ? 'red' : 
                     isSelected ? blueScale.base : grayScale.light;

  // Initial mount
  useEffect(() => {
    // Clear debug logs
    fs.writeFileSync('./xterm-debug.log', 'XTERM DEBUG LOG\n=================\n');
    
    const termCols = Math.floor(cols / 2) - 4;
    const termRows = rows - 6;
    
    fs.appendFileSync('./xterm-debug.log', `Initial setup: cols=${termCols}, rows=${termRows}\n`);
    
    term.current.loadAddon(serializer.current);
    ptyRef.current = pty.spawn('zsh', [], {
      name: 'xterm-256color',
      cols: termCols,
      rows: termRows,
    });

    fs.appendFileSync('./xterm-debug.log', `PTY spawned successfully\n`);

    // Pipe PTY → xterm
    ptyRef.current.onData(data => {
      fs.appendFileSync('./xterm-debug.log', `PTY DATA: ${JSON.stringify(data)}\n`);
      
      term.current.write(data);
      
      try {
        const serialized = serializer.current.serialize();
        fs.appendFileSync('./xterm-debug.log', `SERIALIZED LENGTH: ${serialized.length}\n`);
        fs.appendFileSync('./xterm-debug.log', `SERIALIZED CONTENT: ${JSON.stringify(serialized)}\n`);
        setFrame(serialized);
      } catch (error) {
        fs.appendFileSync('./xterm-debug.log', `SERIALIZE ERROR: ${error}\n`);
        setFrame('SERIALIZE ERROR');
      }
    });

    // Cleanup
    return () => ptyRef.current?.kill();
  }, []);

  // Window resize
  useEffect(() => {
    const termCols = Math.floor(cols / 2) - 4;
    const termRows = rows - 6;
    term.current.resize(termCols, termRows);
    ptyRef.current?.resize(termCols, termRows);
  }, [cols, rows]);

  // Keystrokes when this pane is selected
  useInput((input, key) => {
    if (!isSelected || !ptyRef.current) return;

    fs.appendFileSync('./xterm-debug.log', `INPUT: ${JSON.stringify({input, key})}\n`);

    if (key.return) ptyRef.current.write('\r');
    else if (key.tab) ptyRef.current.write('\t');
    else if (key.backspace || key.delete) ptyRef.current.write('\x7f');
    else if (input) ptyRef.current.write(input);
  }, { isActive: isSelected });

  // Log current frame for debugging
  useEffect(() => {
    fs.appendFileSync('./xterm-debug.log', `RENDER FRAME LENGTH: ${frame.length}\n`);
    if (frame.length < 200) {
      fs.appendFileSync('./xterm-debug.log', `RENDER FRAME: ${JSON.stringify(frame)}\n`);
    }
  }, [frame]);

  return (
    <Box 
      width="50%" 
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      padding={1}
      overflow="hidden"
    >
      <Text>{frame}</Text>
    </Box>
  );
};

export default TerminalPane;