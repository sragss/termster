interface ChatEntry {
	command: string;
	timestamp: string;
	type: string;
}

interface ViewportResult {
	visibleEntries: ChatEntry[];
	hiddenCount: number;
	usedLines: number;
}

/**
 * Estimates the number of lines a chat entry will take when rendered
 * Uses conservative calculation to guarantee no overflow
 */
function estimateEntryLines(entry: ChatEntry, availableWidth: number): number {
	// Calculate the full rendered line: "[timestamp] content"
	const timestampPrefix = `[${entry.timestamp}] `;
	const fullContent = timestampPrefix + entry.command;
	
	// Conservative estimate: assume each character takes 1 unit of width
	// Account for word wrapping by using Math.ceil
	const estimatedLines = Math.ceil(fullContent.length / availableWidth);
	
	// Minimum 1 line per entry
	return Math.max(1, estimatedLines);
}

/**
 * Calculates which chat entries will fit in the available viewport space
 * Works backwards from newest entries to ensure recent content is always visible
 */
export function calculateVisibleEntries(
	entries: ChatEntry[],
	availableLines: number,
	availableWidth: number,
): ViewportResult {
	let usedLines = 0;
	const visibleEntries: ChatEntry[] = [];
	
	// Work backwards from newest entries (most recent first)
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (!entry) continue; // Skip if undefined
		
		const entryLines = estimateEntryLines(entry, availableWidth);
		
		// Only include this entry if it fits completely
		if (usedLines + entryLines <= availableLines) {
			visibleEntries.unshift(entry); // Add to beginning to maintain order
			usedLines += entryLines;
		} else {
			// Stop here - this entry won't fit completely
			break;
		}
	}
	
	const hiddenCount = entries.length - visibleEntries.length;
	
	return {
		visibleEntries,
		hiddenCount,
		usedLines,
	};
}