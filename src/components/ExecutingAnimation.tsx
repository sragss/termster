import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import {blueScale} from '../colors.js';

const ExecutingAnimation = () => {
	const [frame, setFrame] = useState(0);
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

	useEffect(() => {
		const interval = setInterval(() => {
			setFrame(prev => (prev + 1) % frames.length);
		}, 100);

		return () => clearInterval(interval);
	}, []);

	return <Text color={blueScale.light}>{frames[frame]} executing...</Text>;
};

export default ExecutingAnimation;