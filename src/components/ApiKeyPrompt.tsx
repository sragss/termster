import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {blueScale, grayScale} from '../colors.js';
import {spawn} from 'child_process';

const APP_ID = 'be5fe833-4a20-497a-b11f-d1138b5c883c';
const AUTH_URL = `https://echo.merit.systems/cli-auth?appId=${APP_ID}`;

interface ApiKeyPromptProps {
	onApiKeySubmitted: (apiKey: string) => void;
}

const ApiKeyPrompt = ({onApiKeySubmitted}: ApiKeyPromptProps) => {
	const [input, setInput] = useState('');
	const [error, setError] = useState('');
	const [redirectAttempted, setRedirectAttempted] = useState(false);

	useEffect(() => {
		// Auto-redirect on mount
		if (!redirectAttempted) {
			setRedirectAttempted(true);
			openAuthUrl();
		}

	}, [redirectAttempted]);

	const openAuthUrl = async () => {
		const platform = process.platform;
		let command: string;
		let args: string[];

		switch (platform) {
			case 'darwin':
				command = 'open';
				args = [AUTH_URL];
				break;
			case 'win32':
				command = 'start';
				args = [AUTH_URL];
				break;
			default:
				command = 'xdg-open';
				args = [AUTH_URL];
				break;
		}

		try {
			spawn(command, args, { stdio: 'ignore' });
		} catch (error) {
			// Silently fail if browser can't be opened
		}
	};

	useInput((inputChar, key) => {
		if (key.return) {
			if (input.trim()) {
				// Basic validation
				if (!input.startsWith('echo_')) {
					setError('Invalid API key format. Echo API keys should start with "echo_".');
					setInput('');
					return;
				}
				
				setError('');
				onApiKeySubmitted(input.trim());
			}
		} else if (key.backspace || key.delete) {
			setInput(prev => prev.slice(0, -1));
			setError(''); // Clear error on input change
		} else if (inputChar) {
			setInput(prev => prev + inputChar);
			setError(''); // Clear error on input change
		}
	});

	return (
		<Box flexDirection="column" padding={2}>
			{/* Header */}
			<Box marginBottom={2}>
				<Text bold color={blueScale.base}>🔑 API Key Required</Text>
			</Box>

			{/* Error message */}
			{error && (
				<Box marginBottom={1}>
					<Text color="red">Invalid key format</Text>
				</Box>
			)}

			{/* Input prompt */}
			<Box>
				<Text color={grayScale.light}>Paste key: </Text>
				<Text color="white" wrap="truncate">
					{input.length > 0 ? '•'.repeat(Math.min(input.length, 20)) : ''}
					<Text inverse> </Text>
				</Text>
			</Box>

			{/* Footer help */}
			<Box marginTop={1}>
				<Text dimColor>Browser opened automatically</Text>
			</Box>
		</Box>
	);
};

export default ApiKeyPrompt;