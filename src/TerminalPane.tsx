import React from 'react';
import { Box, Text } from 'ink';
import { grayScale, blueScale } from './colors.js';

interface TerminalPaneProps {
  terminalOutput: string;
  isSelected: boolean;
  flashError: boolean;
}

const TerminalPane = ({ terminalOutput, isSelected, flashError }: TerminalPaneProps) => {
  const getBorderColor = () => {
    if (flashError && isSelected) return 'red';
    if (isSelected) return blueScale.base;
    return grayScale.light;
  };

  return (
    <Box 
      width="50%" 
      borderStyle="round"
      borderColor={getBorderColor()}
      flexDirection="column"
      padding={1}
    >
      <Text wrap="wrap">{terminalOutput}</Text>
    </Box>
  );
};

export default TerminalPane;