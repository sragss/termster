import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {grayScale} from './colors.js';

interface HeaderAnimationProps {
	height: number;
}

const HeaderAnimation = ({height}: HeaderAnimationProps) => {
	const [isLoading, setIsLoading] = useState(true);
	const [progress, setProgress] = useState(0);
	const [dotCount, setDotCount] = useState(0);

	// Animated dots for "Initializing..."
	useEffect(() => {
		if (!isLoading) return;

		const timer = setInterval(() => {
			setDotCount(prev => (prev + 1) % 4); // 0, 1, 2, 3, then back to 0
		}, 400);

		return () => clearInterval(timer);
	}, [isLoading]);

	// Loading bar progress with easing
	useEffect(() => {
		if (!isLoading) return;

		const duration = 1000; // 1 second
		const frameRate = 16; // ~60fps
		const startTime = Date.now();

		const updateProgress = () => {
			const elapsed = Date.now() - startTime;
			const rawProgress = Math.min(elapsed / duration, 1);

			// Ease-in cubic easing
			const easedProgress = rawProgress * rawProgress * rawProgress;
			setProgress(Math.round(easedProgress * 100));

			if (rawProgress < 1) {
				setTimeout(updateProgress, frameRate);
			} else {
				setTimeout(() => setIsLoading(false), 200); // Brief pause before showing final content
			}
		};

		// Start progress animation after a short delay
		const timer = setTimeout(() => {
			updateProgress();
		}, 300);

		return () => clearTimeout(timer);
	}, [isLoading]);

	const loadingBar =
		'█'.repeat(Math.floor(progress / 2)) +
		'░'.repeat(50 - Math.floor(progress / 2));
	const dots = '.'.repeat(dotCount);

	return (
		<Box
			width="100%"
			height={height}
			borderStyle="double"
			borderColor="red"
			justifyContent="center"
			padding={1}
		>
			{isLoading ? (
				<Box flexDirection="column" alignItems="center">
					<Text> </Text>
					<Text color={grayScale.xlight}>Initializing{dots}</Text>
					<Text color={grayScale.light}>
						[{loadingBar}] {progress}%
					</Text>
					<Text> </Text>
					<Text> </Text>
				</Box>
			) : (
				<Text>
					{`  ______                       __           
 /_  __/__  _________ ___  _____/ /____  _____
  / / / _ \\/ ___/ __ \`__ \\/ ___/ __/ _ \\/ ___/
 / / /  __/ /  / / / / / (__  ) /_/  __/ /    
/_/  \\___/_/  /_/ /_/ /_/____/\\__/\\___/_/`}
				</Text>
			)}
		</Box>
	);
};

export default HeaderAnimation;
