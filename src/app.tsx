import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import * as pty from 'node-pty';
import * as fs from 'fs';
import { sanitizeTerminalOutput, limitOutputLines } from './terminal-sanitizer.js';
import { grayScale, blueScale } from './colors.js';

const App = () => {
  const [terminalOutput, setTerminalOutput] = useState('');
  const [ptyProcess, setPtyProcess] = useState<any>(null);
  const [selectedPane, setSelectedPane] = useState<'terminal' | 'notes'>('terminal');
  const [notesText, setNotesText] = useState('Your notes here...');

  useInput((input, key) => {
    // Global exit handlers
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
      process.exit(0);
    }
    
    if (key.shift && key.tab) {
      setSelectedPane(prev => prev === 'terminal' ? 'notes' : 'terminal');
    } else if (selectedPane === 'terminal' && ptyProcess) {
      if (key.return) {
        ptyProcess.write('\r');
      } else if (key.backspace || key.delete) {
        ptyProcess.write('\x7f');
      } else if (key.upArrow) {
        ptyProcess.write('\x1b[A');
      } else if (key.downArrow) {
        ptyProcess.write('\x1b[B');
      } else if (key.leftArrow) {
        ptyProcess.write('\x1b[D');
      } else if (key.rightArrow) {
        ptyProcess.write('\x1b[C');
      } else if (input) {
        ptyProcess.write(input);
      }
    } else if (selectedPane === 'notes') {
      if (key.return) {
        setNotesText(prev => prev + '\n');
      } else if (key.backspace || key.delete) {
        setNotesText(prev => prev.slice(0, -1));
      } else if (input) {
        setNotesText(prev => prev + input);
      }
    }
  });

  useEffect(() => {
    // Spawn a shell process
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'zsh';
    const ptyProc = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 40, // Half width for left pane
      rows: 24,
      cwd: process.cwd(),
      env: process.env
    });

    // Capture output from the PTY
    ptyProc.onData((data: string) => {
      // Log raw output to local file for debugging
      fs.appendFileSync('./pty-debug.log', `RAW: ${JSON.stringify(data)}\n`);
      
      setTerminalOutput(prev => {
        const result = sanitizeTerminalOutput(data, prev);
        fs.appendFileSync('./pty-debug.log', `CLEAN: ${JSON.stringify(result.cleanData)}\n`);
        fs.appendFileSync('./pty-debug.log', `FULL: ${JSON.stringify(result.newOutput)}\n`);
        return limitOutputLines(result.newOutput, 1000);
      });
    });

    setPtyProcess(ptyProc);

    return () => {
      ptyProc.kill();
    };
  }, []);

  return (
    <Box width="100%" height="100%" flexDirection="column">
      {/* Header with ASCII art */}
      <Box 
        width="100%" 
        borderStyle="double"
        borderColor="red"
        justifyContent="center"
        padding={1}
        marginBottom={1}
      >
        <Text>
{`  ______                       __           
 /_  __/__  _________ ___  _____/ /____  _____
  / / / _ \\/ ___/ __ \`__ \\/ ___/ __/ _ \\/ ___/
 / / /  __/ /  / / / / / (__  ) /_/  __/ /    
/_/  \\___/_/  /_/ /_/ /_/____/\\__/\\___/_/`}
        </Text>
      </Box>

      <Box width="100%" flexGrow={1}>
        {/* Left pane - Terminal */}
        <Box 
          width="50%" 
          borderStyle="round"
          borderColor={selectedPane === 'terminal' ? blueScale.base : grayScale.light}
          flexDirection="column"
          padding={1}
        >
          <Text wrap="wrap">{terminalOutput}</Text>
        </Box>
        
        {/* Right pane - Notes */}
        <Box 
          width="50%" 
          borderStyle="round"
          borderColor={selectedPane === 'notes' ? blueScale.base : grayScale.light}
          padding={1}
        >
          <Text wrap="wrap">{notesText}</Text>
        </Box>
      </Box>
      
      {/* Status line */}
      <Box width="100%">
        <Text dimColor>
          shift + tab to switch to {selectedPane === 'terminal' ? 'notes' : 'terminal'}
        </Text>
      </Box>
    </Box>
  );
};

export default App;
