import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
// import HeaderAnimation from './HeaderAnimation.js';
import TerminalPane from './TerminalPane.js';
import NotesPane from './NotesPane.js';

const App = () => {
  const { stdout } = useStdout();
  const [selectedPane, setSelectedPane] = useState<'terminal' | 'notes'>('terminal');
  const [notesText, setNotesText] = useState('Your notes here...');

  // Compute window dimensions upfront
  const totalCols = stdout.columns || 80;
  const totalRows = stdout.rows - 2 || 24;
  const statusLineHeight = 1;
  const availableHeight = totalRows - statusLineHeight;
  const paneHeight = availableHeight;

  useInput((input, key) => {
    // Global exit handlers
    if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
      process.exit(0);
    }
    
    // Only handle global app-level actions
    if (key.shift && key.tab) {
      setSelectedPane(prev => prev === 'terminal' ? 'notes' : 'terminal');
    }
    // All other input is handled by individual pane components
  });

  return (
    <Box width="100%" height={totalRows} flexDirection="column">
      {/* <HeaderAnimation /> */}

      <Box width="100%" height={paneHeight}>
        <TerminalPane 
          isSelected={selectedPane === 'terminal'}
          height={paneHeight}
          totalCols={totalCols}
        />
        <NotesPane 
          notesText={notesText}
          isSelected={selectedPane === 'notes'}
          height={paneHeight}
          onTextChange={setNotesText}
        />
      </Box>
      
      {/* Status line */}
      <Box width="100%" height={statusLineHeight}>
        <Text dimColor>
          shift + tab to switch to {selectedPane === 'terminal' ? 'notes' : 'terminal'}
        </Text>
      </Box>
    </Box>
  );
};

export default App;