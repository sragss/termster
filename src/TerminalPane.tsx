import React, {useEffect, useRef, useState, useMemo} from 'react';
import {Text, useInput, Box} from 'ink';
import pty from 'node-pty';
import xtermHeadless from '@xterm/headless';
import addonSerialize from '@xterm/addon-serialize';
import {grayScale, blueScale} from './colors.js';
import {sanitizeTerminalOutput} from './terminal-sanitizer.js';
import {TerminalHistoryService} from './services/terminal-history.js';
import {xtermSessionLogger} from './services/xterm-logger.js';
import {Logger} from './services/logger.js';

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
		// Initialize session logger
		xtermSessionLogger.initialize();

		const termCols = Math.floor(cols / 2) - 4;
		const termRows = rows - 2; // Account for border and padding

		Logger.info('Terminal pane initialized', { cols: termCols, rows: termRows });

		term.current.loadAddon(serializer.current);
		ptyRef.current = pty.spawn('zsh', [], {
			name: 'xterm-256color',
			cols: termCols,
			rows: termRows,
		});

		Logger.info('PTY spawned successfully');

		// Notify parent component that PTY is ready
		if (onPtyReady && ptyRef.current) {
			onPtyReady(ptyRef.current);
		}

		// Pipe PTY → xterm
		ptyRef.current.onData(data => {
			// Log raw terminal output to session log (like shell history)
			xtermSessionLogger.logOutput(data);

			// Track command output for history
			if (historyService && !awaitingCommand.current) {
				commandOutput.current += data;
			}

			term.current.write(data);

			// Let React handle the updates efficiently
			setTimeout(() => {
				try {
					const serialized = serializer.current.serialize();
					let sanitized = sanitizeTerminalOutput(serialized);
					
					// Use xterm's configured dimensions minus UI overhead
					const lines = sanitized.split('\n');
					const xtermRows = term.current.rows;
					const uiOffset = 4;
					const visibleRows = xtermRows - uiOffset;
					
					if (lines.length > visibleRows) {
						const recentLines = lines.slice(-visibleRows);
						sanitized = recentLines.join('\n');
					}
					
					setFrame(sanitized);
				} catch (error) {
					Logger.error('Terminal serialization error', { 
						error: error instanceof Error ? error.message : String(error) 
					});
					setFrame('SERIALIZE ERROR');
				}
			}, 0);
		});

		// Cleanup
		return () => {
			ptyRef.current?.kill();
			xtermSessionLogger.shutdown();
		};
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

		// Log input for system debugging (only special keys)
		if (key.ctrl || key.meta || key.return) {
			Logger.debug('Terminal input', { 
				input, 
				key: Object.keys(key).filter(k => key[k as keyof typeof key]) 
			});
		}

		// Track commands for history
		if (historyService) {
			if (awaitingCommand.current) {
				if (key.return) {
					// Command submitted - log to session
					if (currentCommand.current.trim()) {
						xtermSessionLogger.logCommand(currentCommand.current.trim());
					}
					
					awaitingCommand.current = false;
					commandOutput.current = '';

					// Set a timeout to capture the command completion
					setTimeout(() => {
						if (currentCommand.current.trim()) {
							historyService.addCommand(
								currentCommand.current.trim(),
								commandOutput.current.trim(),
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

	// Remove frame logging - not needed for session logging

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
