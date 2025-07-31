import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {blueScale, grayScale} from '../colors.js';

const APP_ID = 'be5fe833-4a20-497a-b11f-d1138b5c883c';
const AUTH_URL = `https://echo.merit.systems/cli-auth?appId=${APP_ID}`;

interface ApiKeyPromptProps {
	onApiKeySubmitted: (apiKey: string) => void;
}

const ApiKeyPrompt = ({onApiKeySubmitted}: ApiKeyPromptProps) => {
	const [input, setInput] = useState('');
	const [error, setError] = useState('');
	const [showInstructions, setShowInstructions] = useState(true);

	useEffect(() => {
		// Auto-hide instructions after 5 seconds
		const timer = setTimeout(() => {
			setShowInstructions(false);
		}, 5000);
		return () => clearTimeout(timer);
	}, []);

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
			<Box marginBottom={1}>
				<Text bold color={blueScale.base}>🔑 Echo API Key Required</Text>
			</Box>

			{/* Instructions */}
			{showInstructions && (
				<Box flexDirection="column" marginBottom={2}>
					<Text dimColor>1. Visit: {AUTH_URL}</Text>
					<Text dimColor>2. Generate your API key</Text>
					<Text dimColor>3. Paste it below and press Enter</Text>
					<Text dimColor>(Instructions will auto-hide in a few seconds)</Text>
				</Box>
			)}

			{/* Error message */}
			{error && (
				<Box marginBottom={1}>
					<Text color="red">❌ {error}</Text>
				</Box>
			)}

			{/* Input prompt */}
			<Box>
				<Text color={grayScale.light}>Echo API Key: </Text>
				<Text color="white">
					{input.replace(/./g, '*')} {/* Mask the input for security */}
					<Text inverse> </Text>
				</Text>
			</Box>

			{/* Footer help */}
			<Box marginTop={1}>
				<Text dimColor>Your API key will be saved to ~/.termster/config.json</Text>
			</Box>
		</Box>
	);
};

export default ApiKeyPrompt;