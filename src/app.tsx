import React, {useState, useRef} from 'react';
import {Box, Text, useInput, useStdout} from 'ink';
import pty from 'node-pty';
import HeaderAnimation from './HeaderAnimation.js';
import TerminalPane from './TerminalPane.js';
import PromptPane from './PromptPane.js';

const App = () => {
	const {stdout} = useStdout();
	const [selectedPane, setSelectedPane] = useState<'terminal' | 'prompt'>(
		'terminal',
	);
	const ptyRef = useRef<pty.IPty | null>(null);

	// Compute window dimensions upfront
	const totalCols = stdout.columns || 80;
	const totalRows = stdout.rows - 2 || 24;
	const statusLineHeight = 1;
	const headerHeight = 8; // HeaderAnimation height
	const availableHeight = totalRows - statusLineHeight - headerHeight;
	const paneHeight = availableHeight;

	const handleCommand = (command: string) => {
		if (ptyRef.current) {
			// Send a newline first to ensure we're on a fresh line
			ptyRef.current.write('\r');
			// Send the command
			console.log('Sending command to terminal:', JSON.stringify(command));
			ptyRef.current.write(command + '\r');
		}
	};

	useInput((input, key) => {
		// Global exit handlers
		if ((key.ctrl && input === 'c') || (key.ctrl && input === 'd')) {
			process.exit(0);
		}

		// Only handle global app-level actions
		if (key.shift && key.tab) {
			setSelectedPane(prev => (prev === 'terminal' ? 'prompt' : 'terminal'));
		}
		// All other input is handled by individual pane components
	});

	return (
		<Box width="100%" height={totalRows} flexDirection="column">
			<HeaderAnimation height={headerHeight} />

			<Box width="100%" height={paneHeight}>
				<TerminalPane
					isSelected={selectedPane === 'terminal'}
					height={paneHeight}
					totalCols={totalCols}
					onPtyReady={pty => {
						ptyRef.current = pty;
					}}
				/>
				<PromptPane
					isSelected={selectedPane === 'prompt'}
					height={paneHeight}
					onCommand={handleCommand}
				/>
			</Box>

			{/* Status line */}
			<Box width="100%" height={statusLineHeight}>
				<Text dimColor>
					shift + tab to switch to{' '}
					{selectedPane === 'terminal' ? 'prompt' : 'terminal'}
				</Text>
			</Box>
		</Box>
	);
};

export default App;
