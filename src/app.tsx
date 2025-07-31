import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
// import HeaderAnimation from './HeaderAnimation.js';
import TerminalPane from './TerminalPane.js';
import NotesPane from './NotesPane.js';

const App = () => {
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
    } else if (selectedPane === 'notes') {
      if (key.return) {
        setNotesText(prev => prev + '\n');
      } else if (key.backspace || key.delete) {
        setNotesText(prev => prev.slice(0, -1));
      } else if (input) {
        setNotesText(prev => prev + input);
      }
    } else if (selectedPane === 'terminal' && (key.leftArrow || key.rightArrow)) {
      // Flash error for unsupported horizontal navigation in terminal
      setFlashError(true);
      setTimeout(() => setFlashError(false), 200);
    }
  });

  return (
    <Box width="100%" height="100%" flexDirection="column">
      {/* <HeaderAnimation /> */}

      <Box width="100%" flexGrow={1}>
        <TerminalPane 
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