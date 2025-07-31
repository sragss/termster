import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import * as pty from 'node-pty';
import * as fs from 'fs';
import { sanitizeTerminalOutput, limitOutputLines } from './terminal-sanitizer.js';
import HeaderAnimation from './HeaderAnimation.js';
import TerminalPane from './TerminalPane.js';
import NotesPane from './NotesPane.js';

const App = () => {
  const [terminalOutput, setTerminalOutput] = useState('');
  const [, setTerminalHistory] = useState('');
  const [ptyProcess, setPtyProcess] = useState<any>(null);
  const [selectedPane, setSelectedPane] = useState<'terminal' | 'notes'>('terminal');
  const [notesText, setNotesText] = useState('Your notes here...');
  const [flashError, setFlashError] = useState(false);

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
      } else if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || key.pageUp || key.pageDown) {
        // Flash error for unsupported keys
        setFlashError(true);
        setTimeout(() => setFlashError(false), 200);
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
    // Clear debug log at startup
    fs.writeFileSync('./pty-debug.log', '');
    
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
        fs.appendFileSync('./pty-debug.log', `CLEAR: ${result.shouldClear}\n`);
        
        // Always update history (never gets cleared)
        setTerminalHistory(prevHistory => limitOutputLines(prevHistory + result.cleanData, 10000));
        
        // Handle clear command
        if (result.shouldClear) {
          return result.cleanData; // Start fresh with just the new data
        }
        
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
      <HeaderAnimation />

      <Box width="100%" flexGrow={1}>
        <TerminalPane 
          terminalOutput={terminalOutput}
          isSelected={selectedPane === 'terminal'}
          flashError={flashError}
        />
        <NotesPane 
          notesText={notesText}
          isSelected={selectedPane === 'notes'}
        />
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
