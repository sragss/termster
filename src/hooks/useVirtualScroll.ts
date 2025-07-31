import {useState, useCallback, useMemo} from 'react';

interface UseVirtualScrollOptions {
	maxItems: number;
	itemHeight?: number;
	autoScrollToBottom?: boolean;
}

interface UseVirtualScrollReturn<T> {
	items: T[];
	visibleItems: T[];
	addItem: (item: T) => void;
	addItems: (items: T[]) => void;
	setMaxVisibleItems: (max: number) => void;
	clear: () => void;
	scrollToBottom: () => void;
}

export function useVirtualScroll<T>({
	maxItems,
	autoScrollToBottom = true,
}: UseVirtualScrollOptions): UseVirtualScrollReturn<T> {
	const [items, setItems] = useState<T[]>([]);
	const [maxVisibleItems, setMaxVisibleItems] = useState<number>(50);

	const addItem = useCallback((item: T) => {
		setItems(prev => {
			const newItems = [...prev, item];
			// Keep only the last maxItems
			if (newItems.length > maxItems) {
				return newItems.slice(-maxItems);
			}
			return newItems;
		});
	}, [maxItems]);

	const addItems = useCallback((newItems: T[]) => {
		setItems(prev => {
			const combined = [...prev, ...newItems];
			// Keep only the last maxItems
			if (combined.length > maxItems) {
				return combined.slice(-maxItems);
			}
			return combined;
		});
	}, [maxItems]);

	const clear = useCallback(() => {
		setItems([]);
	}, []);

	const scrollToBottom = useCallback(() => {
		// This is handled by the visibleItems calculation
		// when autoScrollToBottom is true
	}, []);

	const visibleItems = useMemo(() => {
		if (autoScrollToBottom) {
			// Show the last N items that fit in the visible area
			return items.slice(-maxVisibleItems);
		}
		// For future: implement scroll position when not auto-scrolling
		return items.slice(0, maxVisibleItems);
	}, [items, maxVisibleItems, autoScrollToBottom]);

	return {
		items,
		visibleItems,
		addItem,
		addItems,
		setMaxVisibleItems,
		clear,
		scrollToBottom,
	};
}