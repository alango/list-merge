import type { Tag, InputList } from '../types/index';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a tag name for creation
 * @param name - The tag name to validate
 * @param existingTags - Array of existing tags to check for duplicates
 * @param inputLists - Array of input lists to check for reserved names
 * @returns Validation result with isValid flag and optional error message
 */
export const validateTag = (
  name: string, 
  existingTags: Tag[], 
  inputLists: InputList[] = []
): ValidationResult => {
  // Length validation
  if (name.length < 1) {
    return { isValid: false, error: 'Tag name cannot be empty' };
  }
  if (name.length > 50) {
    return { isValid: false, error: 'Tag name cannot exceed 50 characters' };
  }

  // Trim whitespace
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Tag name cannot be just whitespace' };
  }

  // Duplicate prevention (case-insensitive)
  const isDuplicate = existingTags.some(tag => 
    tag.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return { isValid: false, error: 'A tag with this name already exists' };
  }

  // Reserved names (source list names)
  const isReserved = inputLists.some(list =>
    list.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isReserved) {
    return { isValid: false, error: 'Cannot use source list names as tag names' };
  }

  return { isValid: true };
};

/**
 * Validates a tag name for editing (excludes current tag from duplicate check)
 * @param name - The tag name to validate
 * @param tagId - The ID of the tag being edited (to exclude from duplicate check)
 * @param existingTags - Array of existing tags to check for duplicates
 * @param inputLists - Array of input lists to check for reserved names
 * @returns Validation result with isValid flag and optional error message
 */
export const validateTagForEdit = (
  name: string, 
  tagId: string,
  existingTags: Tag[], 
  inputLists: InputList[] = []
): ValidationResult => {
  // Length validation
  if (name.length < 1) {
    return { isValid: false, error: 'Tag name cannot be empty' };
  }
  if (name.length > 50) {
    return { isValid: false, error: 'Tag name cannot exceed 50 characters' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Tag name cannot be just whitespace' };
  }

  // Duplicate prevention (excluding current tag)
  const isDuplicate = existingTags.some(tag => 
    tag.id !== tagId && tag.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return { isValid: false, error: 'A tag with this name already exists' };
  }

  // Reserved names (source list names)
  const isReserved = inputLists.some(list =>
    list.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isReserved) {
    return { isValid: false, error: 'Cannot use source list names as tag names' };
  }

  return { isValid: true };
};