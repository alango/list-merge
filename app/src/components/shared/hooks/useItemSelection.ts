import { useCallback } from 'react';

interface UseItemSelectionProps {
  onSelect: (isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  excludeSelectors?: string[]; // CSS selectors to exclude from triggering selection
}

/**
 * Hook for handling item selection with multi-select support
 * Returns a click handler that respects modifier keys and excludes clicks on interactive elements
 */
export const useItemSelection = ({ 
  onSelect, 
  excludeSelectors = ['button', 'input', '.tag-input'] 
}: UseItemSelectionProps) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't select if clicking on excluded elements
    const target = e.target as HTMLElement;
    const shouldExclude = excludeSelectors.some(selector => {
      if (selector.startsWith('.')) {
        return target.closest(selector);
      } else {
        return target.tagName.toLowerCase() === selector.toLowerCase() || target.closest(selector);
      }
    });
    
    if (shouldExclude) {
      return;
    }
    
    const isMultiSelect = e.ctrlKey || e.metaKey;
    const isShiftSelect = e.shiftKey;
    onSelect(isMultiSelect, isShiftSelect);
  }, [onSelect, excludeSelectors]);

  return { handleClick };
};