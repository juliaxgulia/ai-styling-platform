import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUpload } from '@/components/photo-upload';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PhotoUpload Component', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnUploadError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  const defaultProps = {
    analysisType: 'body' as const,
    onUploadComplete: mockOnUploadComplete,
    onUploadError: mockOnUploadError,
  };

  it('renders upload area with correct guidelines for body analysis', () => {
    render(<PhotoUpload {...defaultProps} />);
    
    expect(screen.getByText('Upload Full Body Photo')).toBeInTheDocument();
    expect(screen.getByText('Full Body Photo Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Stand straight with arms at your sides')).toBeInTheDocument();
    expect(screen.getByText('Drop your photo here or click to browse')).toBeInTheDocument();
  });

  it('renders upload area with correct guidelines for portrait analysis', () => {
    render(<PhotoUpload {...defaultProps} analysisType="portrait" />);
    
    expect(screen.getByText('Upload Portrait Photo')).toBeInTheDocument();
    expect(screen.getByText('Portrait Photo Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Face the camera directly with good lighting')).toBeInTheDocument();
  });

  it('handles file selection via file input', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
    expect(screen.getByText('Upload Photo')).toBeInTheDocument();
  });

  it('validates file type and shows error for invalid files', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
    
    // Simulate file selection by triggering the change event directly
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    expect(mockOnUploadError).toHaveBeenCalledWith('Please upload a JPEG, PNG, or WebP image.');
  });

  it('validates file size and shows error for large files', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload {...defaultProps} />);
    
    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    
    await user.upload(fileInput, largeFile);
    
    expect(mockOnUploadError).toHaveBeenCalledWith('File size must be less than 10MB.');
  });

  it('handles drag and drop functionality', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    const dropZone = screen.getByText('Drop your photo here or click to browse').closest('div');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Simulate drag enter
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
    
    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
    
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
  });

  it('uploads file successfully', async () => {
    const user = userEvent.setup();
    
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://s3.amazonaws.com/bucket/key?signature=abc',
          imageKey: 'user123/body/image.jpg',
          expiresIn: 3600
        })
      })
      .mockResolvedValueOnce({
        ok: true,
      });
    
    render(<PhotoUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    const uploadButton = screen.getByText('Upload Photo');
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/analysis/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
          analysisType: 'body',
        }),
      });
    });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('https://s3.amazonaws.com/bucket/key?signature=abc', {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });
    });
    
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith('https://s3.amazonaws.com/bucket/key');
    });
  });

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: { message: 'Upload failed' }
      })
    });
    
    render(<PhotoUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    const uploadButton = screen.getByText('Upload Photo');
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUploadError).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('allows clearing selected file', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
    
    // Find the X button specifically (it's the first button in the preview area)
    const buttons = screen.getAllByRole('button');
    const clearButton = buttons.find(button => button.querySelector('svg[class*="lucide-x"]'));
    
    if (clearButton) {
      await user.click(clearButton);
    }
    
    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('Drop your photo here or click to browse')).toBeInTheDocument();
  });

  it('disables upload when isUploading prop is true', () => {
    render(<PhotoUpload {...defaultProps} isUploading={true} />);
    
    const dropZone = screen.getByText('Drop your photo here or click to browse').closest('div');
    expect(dropZone).toHaveClass('pointer-events-none', 'opacity-50');
  });

  it('shows upload progress during upload', async () => {
    const user = userEvent.setup();
    
    // Mock successful API responses with delay
    mockFetch
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              uploadUrl: 'https://s3.amazonaws.com/bucket/key?signature=abc',
              imageKey: 'user123/body/image.jpg',
              expiresIn: 3600
            })
          }), 100)
        )
      )
      .mockResolvedValueOnce({
        ok: true,
      });
    
    render(<PhotoUpload {...defaultProps} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    const uploadButton = screen.getByText('Upload Photo');
    await user.click(uploadButton);
    
    // Should show progress during upload
    await waitFor(() => {
      expect(screen.getByText(/Uploading.../)).toBeInTheDocument();
    });
  });
});