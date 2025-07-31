import React from 'react';
import { Box, Text } from 'ink';
import { grayScale, blueScale } from './colors.js';

interface NotesPaneProps {
  notesText: string;
  isSelected: boolean;
}

const NotesPane = ({ notesText, isSelected }: NotesPaneProps) => {
  return (
    <Box 
      width="50%" 
      borderStyle="round"
      borderColor={isSelected ? blueScale.base : grayScale.light}
      padding={1}
    >
      <Text wrap="wrap">{notesText}</Text>
    </Box>
  );
};

export default NotesPane;