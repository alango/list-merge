import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportPreviewModal } from '../components/ImportPreviewModal';
import type { ImportResult } from '../utils/fileProcessing';

describe('ImportPreviewModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const successResult: ImportResult<string[]> = {
    success: true,
    data: ['Item 1', 'Item 2', 'Item 3'],
    itemCount: 3
  };

  const failureResult: ImportResult<string[]> = {
    success: false,
    error: 'CSV parsing error: Invalid format'
  };

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ImportPreviewModal
          isOpen={false}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Import Preview: test.csv')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and result is provided', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Import Preview: test.csv')).toBeInTheDocument();
    });
  });

  describe('successful import display', () => {
    it('should display all items from successful result', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should display item count in status bar', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('✓ 3 items ready to import')).toBeInTheDocument();
    });

    it('should show import button with correct item count', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Import 3 Items')).toBeInTheDocument();
    });
  });

  describe('failed import display', () => {
    it('should display error message for failed import', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={failureResult}
          fileName="invalid.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Import Failed')).toBeInTheDocument();
      expect(screen.getByText('CSV parsing error: Invalid format')).toBeInTheDocument();
    });

    it('should not show import button for failed import', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={failureResult}
          fileName="invalid.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText(/Import \d+ Items/)).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onConfirm when Import button is clicked', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Import 3 Items'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Cancel button is clicked', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="test.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('warnings display', () => {
    it('should display warnings when present', () => {
      const resultWithWarnings: ImportResult<string[]> = {
        success: true,
        data: ['Item 1', 'Item 2'],
        itemCount: 2,
        warnings: ['2 lines were filtered out (empty or too long)']
      };

      render(
        <ImportPreviewModal
          isOpen={true}
          result={resultWithWarnings}
          fileName="test.txt"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('⚠ 2 lines were filtered out (empty or too long)')).toBeInTheDocument();
    });
  });

  describe('file name display', () => {
    it('should display the provided file name in header', () => {
      render(
        <ImportPreviewModal
          isOpen={true}
          result={successResult}
          fileName="my-important-list.csv"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Import Preview: my-important-list.csv')).toBeInTheDocument();
    });
  });
});