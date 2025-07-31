#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

meow(
	`
	Usage
	  $ termster

	Options
		--name  Your name

	Examples
	  $ termster --name=Jane
	  Hello, Jane
`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
			},
		},
	},
);

// Clear terminal screen before launching
if (process.stdout.isTTY) {
	process.stdout.write('\u001b[2J\u001b[0;0H');
}

render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
