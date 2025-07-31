import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {spawn} from 'child_process';

const APP_ID = 'be5fe833-4a20-497a-b11f-d1138b5c883c';
const AUTH_URL = `https://echo.merit.systems/cli-auth?appId=${APP_ID}`;
const CONFIG_DIR = path.join(os.homedir(), '.termster');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
	ECHO_API_KEY?: string;
}

export class ConfigService {
	private config: Config = {};

	constructor() {
		this.ensureConfigDir();
		this.loadConfig();
	}

	// Check if API key exists without triggering auth flow
	async hasApiKey(): Promise<boolean> {
		// Check environment variable first
		if (process.env['ECHO_API_KEY']) {
			return true;
		}

		// Check config file
		return !!this.config.ECHO_API_KEY;
	}

	// Save API key directly (for React component)
	async saveApiKey(apiKey: string): Promise<void> {
		this.config.ECHO_API_KEY = apiKey;
		this.saveConfig();
	}

	private ensureConfigDir(): void {
		if (!fs.existsSync(CONFIG_DIR)) {
			fs.mkdirSync(CONFIG_DIR, {recursive: true});
		}
	}

	private loadConfig(): void {
		if (fs.existsSync(CONFIG_FILE)) {
			try {
				const content = fs.readFileSync(CONFIG_FILE, 'utf8');
				this.config = JSON.parse(content);
			} catch (error) {
				console.warn('Failed to load config file, starting fresh');
				this.config = {};
			}
		}
	}

	private saveConfig(): void {
		fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
	}

	async getApiKey(): Promise<string> {
		// First check environment variable
		if (process.env['ECHO_API_KEY']) {
			return process.env['ECHO_API_KEY'];
		}

		// Then check config file
		if (this.config.ECHO_API_KEY) {
			return this.config.ECHO_API_KEY;
		}

		// If no API key found, start authentication flow
		return this.authenticateUser();
	}

	private async authenticateUser(): Promise<string> {
		console.log("\n🔑 No API key found. Let's get you set up with Echo API!\n");

		// Try to open the auth URL in browser
		await this.openAuthUrl();

		console.log(`\n📋 Please visit: ${AUTH_URL}`);
		console.log('   Generate your API key and copy it.\n');

		// Prompt for API key
		const apiKey = await this.promptForApiKey();

		// Store the API key
		this.config.ECHO_API_KEY = apiKey;
		this.saveConfig();

		console.log("\n✅ API key saved! You won't need to do this again.\n");

		return apiKey;
	}

	private async openAuthUrl(): Promise<void> {
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
			spawn(command, args, {stdio: 'ignore'});
			console.log('🌐 Opening authentication page in your browser...');
		} catch (error) {
			console.log('⚠️  Could not open browser automatically.');
		}
	}

	private async promptForApiKey(): Promise<string> {
		const readline = await import('readline');
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise(resolve => {
			rl.question('🔑 Paste your Echo API key here: ', apiKey => {
				rl.close();

				// Basic validation
				if (!apiKey || apiKey.trim().length === 0) {
					console.log('❌ API key cannot be empty. Please try again.');
					this.promptForApiKey().then(resolve);
					return;
				}

				if (!apiKey.startsWith('echo_')) {
					console.log(
						'❌ Invalid API key format. Echo API keys should start with "echo_".',
					);
					this.promptForApiKey().then(resolve);
					return;
				}

				resolve(apiKey.trim());
			});
		});
	}

	getConfigPath(): string {
		return CONFIG_FILE;
	}
}
