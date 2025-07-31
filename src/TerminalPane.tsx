import React, {useEffect, useRef, useState, useMemo} from 'react';
import {Text, useInput, Box} from 'ink';
import pty from 'node-pty';
import xtermHeadless from '@xterm/headless';
import addonSerialize from '@xterm/addon-serialize';
import {grayScale, blueScale} from './colors.js';
import {sanitizeTerminalOutput} from './terminal-sanitizer.js';
import {TerminalHistoryService} from './services/terminal-history.js';
import * as fs from 'fs/promises';

const {Terminal} = xtermHeadless;
const {SerializeAddon} = addonSerialize;

interface TerminalPaneProps {
	isSelected: boolean;
	height: number;
	totalCols: number;
	onPtyReady?: (pty: pty.IPty) => void;
	historyService?: TerminalHistoryService;
}

const TerminalPane = ({
	isSelected,
	height,
	totalCols,
	onPtyReady,
	historyService,
}: TerminalPaneProps) => {
	// Use passed-in dimensions instead of computing them
	const cols = totalCols;
	const rows = height;

	// Internal flash error state (removed since arrow keys are now supported)
	const term = useRef(
		new Terminal({
			cols: Math.floor(cols / 2) - 4,
			rows: rows - 2, // Account for border and padding
			allowProposedApi: true,
		}),
	);
	const serializer = useRef(new SerializeAddon());
	const [frame, setFrame] = useState('');
	const ptyRef = useRef<pty.IPty | null>(null);
	
	// Command tracking for history
	const currentCommand = useRef<string>('');
	const commandOutput = useRef<string>('');
	const awaitingCommand = useRef<boolean>(true);

	// Memoize border color to prevent unnecessary layout changes
	const borderColor = useMemo(() => {
		return isSelected ? blueScale.base : grayScale.light;
	}, [isSelected]);

	// Initial mount
	useEffect(() => {
		// Clear debug logs
		fs.writeFile(
			'./xterm-debug.log',
			'XTERM DEBUG LOG\n=================\n',
		).catch(console.error);

		const termCols = Math.floor(cols / 2) - 4;
		const termRows = rows - 2; // Account for border and padding

		fs.appendFile(
			'./xterm-debug.log',
			`Initial setup: cols=${termCols}, rows=${termRows}\n`,
		).catch(console.error);

		term.current.loadAddon(serializer.current);
		ptyRef.current = pty.spawn('zsh', [], {
			name: 'xterm-256color',
			cols: termCols,
			rows: termRows,
		});

		fs.appendFile('./xterm-debug.log', `PTY spawned successfully\n`).catch(
			console.error,
		);

		// Notify parent component that PTY is ready
		if (onPtyReady && ptyRef.current) {
			onPtyReady(ptyRef.current);
		}

		// Pipe PTY → xterm
		ptyRef.current.onData(data => {
			fs.appendFile(
				'./xterm-debug.log',
				`PTY DATA: ${JSON.stringify(data)}\n`,
			).catch(console.error);

			// Track command output for history
			if (historyService && !awaitingCommand.current) {
				commandOutput.current += data;
			}

			term.current.write(data);

			// Use setTimeout to ensure xterm has processed the data before serializing
			setTimeout(() => {
				try {
					const serialized = serializer.current.serialize();
					const sanitized = sanitizeTerminalOutput(serialized);
					fs.appendFile(
						'./xterm-debug.log',
						`SERIALIZED LENGTH: ${serialized.length}\n`,
					).catch(console.error);
					fs.appendFile(
						'./xterm-debug.log',
						`SERIALIZED CONTENT: ${JSON.stringify(serialized)}\n`,
					).catch(console.error);
					setFrame(sanitized);
				} catch (error) {
					fs.appendFile(
						'./xterm-debug.log',
						`SERIALIZE ERROR: ${error}\n`,
					).catch(console.error);
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

		fs.appendFile(
			'./xterm-debug.log',
			`INPUT: ${JSON.stringify({input, key})}\n`,
		).catch(console.error);

		// Track commands for history
		if (historyService) {
			if (awaitingCommand.current) {
				if (key.return) {
					// Command submitted
					awaitingCommand.current = false;
					commandOutput.current = '';
					
					// Set a timeout to capture the command completion
					setTimeout(() => {
						if (currentCommand.current.trim()) {
							historyService.addCommand(
								currentCommand.current.trim(),
								commandOutput.current.trim()
							);
						}
						currentCommand.current = '';
						commandOutput.current = '';
						awaitingCommand.current = true;
					}, 1000); // Wait 1 second for command output
				} else if (key.backspace || key.delete) {
					currentCommand.current = currentCommand.current.slice(0, -1);
				} else if (input && input !== '\r' && input !== '\n') {
					currentCommand.current += input;
				}
			}
		}

		// Handle arrow keys with proper escape sequences
		if (key.upArrow) ptyRef.current.write('\u001b[A');
		else if (key.downArrow) ptyRef.current.write('\u001b[B');
		else if (key.rightArrow) ptyRef.current.write('\u001b[C');
		else if (key.leftArrow) ptyRef.current.write('\u001b[D');
		else if (key.return) ptyRef.current.write('\r');
		else if (key.tab) ptyRef.current.write('\t');
		else if (key.backspace || key.delete) ptyRef.current.write('\x7f');
		else if (input) ptyRef.current.write(input);
	});

	// Log current frame for debugging
	useEffect(() => {
		fs.appendFile(
			'./xterm-debug.log',
			`RENDER FRAME LENGTH: ${frame.length}\n`,
		).catch(console.error);
		if (frame.length < 200) {
			fs.appendFile(
				'./xterm-debug.log',
				`RENDER FRAME: ${JSON.stringify(frame)}\n`,
			).catch(console.error);
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
