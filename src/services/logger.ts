import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	data?: Record<string, unknown>;
}

export class Logger {
	private static logDir = join(homedir(), '.termster', 'logs');
	private static logFile: string;
	private static enabled: boolean = false;
	private static writeQueue: Promise<void> = Promise.resolve();
	private static sessionInitialized: boolean = false;

	public static setEnabled(enabled: boolean): void {
		Logger.enabled = enabled;
		if (enabled && !Logger.sessionInitialized) {
			Logger.initializeSession();
		}
	}

	public static isEnabled(): boolean {
		return Logger.enabled;
	}

	public static getLogFile(): string | null {
		return Logger.sessionInitialized ? Logger.logFile : null;
	}

	private static initializeSession(): void {
		const now = new Date();
		const timestamp = now.toISOString()
			.replace(/:/g, '-')
			.replace(/\./g, '_')
			.replace('T', '_')
			.replace('Z', '');
		Logger.logFile = join(Logger.logDir, `session_${timestamp}.log`);
		Logger.sessionInitialized = true;
		
		// Write session start marker
		const sessionStart = Logger.formatLogEntry(LogLevel.INFO, 'SESSION_START', {
			timestamp: now.toISOString(),
			logFile: Logger.logFile
		});
		Logger.queueWrite(sessionStart);
	}

	private static async ensureLogDirectory(): Promise<void> {
		try {
			await fs.mkdir(Logger.logDir, {recursive: true});
		} catch (error) {
			console.error('Failed to create log directory:', error);
		}
	}

	private static formatLogEntry(level: LogLevel, message: string, data?: Record<string, unknown>): string {
		const timestamp = new Date().toISOString();
		const dataStr = data ? `\n  Data: ${JSON.stringify(data, null, 2)}` : '';
		return `[${timestamp}] ${level}: ${message}${dataStr}\n`;
	}

	private static queueWrite(entry: string): void {
		if (!Logger.enabled) return;

		Logger.writeQueue = Logger.writeQueue.then(async () => {
			try {
				await Logger.ensureLogDirectory();
				await fs.appendFile(Logger.logFile, entry, 'utf8');
			} catch (error) {
				console.error('Failed to write log:', error);
			}
		});
	}

	public static debug(message: string, data?: Record<string, unknown>): void {
		const entry = Logger.formatLogEntry(LogLevel.DEBUG, message, data);
		Logger.queueWrite(entry);
	}

	public static info(message: string, data?: Record<string, unknown>): void {
		const entry = Logger.formatLogEntry(LogLevel.INFO, message, data);
		Logger.queueWrite(entry);
	}

	public static warn(message: string, data?: Record<string, unknown>): void {
		const entry = Logger.formatLogEntry(LogLevel.WARN, message, data);
		Logger.queueWrite(entry);
	}

	public static error(message: string, data?: Record<string, unknown>): void {
		const entry = Logger.formatLogEntry(LogLevel.ERROR, message, data);
		Logger.queueWrite(entry);
	}

}