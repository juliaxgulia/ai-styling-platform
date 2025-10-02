import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProfileManagement } from '@/components/profile-management';

// Mock fetch
global.fetch = jest.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const mockProfileData = {
  styleProfile: {
    emotions: ['Confident', 'Powerful'],
    archetype: ['The Hero'],
    essence: ['Classic'],
    lifestyle: ['Professional'],
    values: ['High Quality', 'Timeless / Classic']
  },
  physicalProfile: {
    bodyShape: 'middle_balance',
    bodyShapeConfidence: 0.85,
    colorPalette: {
      season: 'Deep Winter',
      colors: ['#000000', '#FFFFFF', '#FF0000', '#0000FF'],
      confidence: 0.92,
      skinTone: 'cool',
      hairColor: 'dark brown',
      eyeColor: 'brown'
    }
  },
  preferences: {
    zipCode: '10001',
    maxBudget: 200
  },
  analysisPhotos: {
    bodyPhotoUrl: 'https://example.com/body.jpg',
    portraitPhotoUrl: 'https://example.com/portrait.jpg'
  },
  climateInfo: {
    region: 'New York, NY',
    averageTemp: 55,
    seasons: ['Spring', 'Summer', 'Fall', 'Winter']
  }
};

describe('ProfileManagement', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders profile management interface', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          physicalProfile: mockProfileData.physicalProfile,
          analysisPhotos: mockProfileData.analysisPhotos
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: mockProfileData.preferences,
          climateInfo: mockProfileData.climateInfo
        })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Your Style Profile')).toBeInTheDocument();
      expect(screen.getByText('Style Preferences')).toBeInTheDocument();
      expect(screen.getByText('Physical Analysis')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });
  });

  it('displays profile completeness progress', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          physicalProfile: mockProfileData.physicalProfile,
          analysisPhotos: mockProfileData.analysisPhotos
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: mockProfileData.preferences,
          climateInfo: mockProfileData.climateInfo
        })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Profile Completeness')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('displays style profile tags', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Confident')).toBeInTheDocument();
      expect(screen.getByText('Powerful')).toBeInTheDocument();
      expect(screen.getByText('The Hero')).toBeInTheDocument();
      expect(screen.getByText('Classic')).toBeInTheDocument();
      expect(screen.getByText('Professional')).toBeInTheDocument();
    });
  });

  it('allows editing style preferences', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Style Preferences')).toBeInTheDocument();
    });

    // Click edit button for style preferences
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Should show save and cancel buttons
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Should show clickable tags
    const emotionTags = screen.getAllByText('Relaxed');
    expect(emotionTags[0]).toBeInTheDocument();
  });

  it('saves style profile changes', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Profile updated successfully' })
      } as Response);

    render(<ProfileManagement onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('Style Preferences')).toBeInTheDocument();
    });

    // Start editing
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Save changes
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile/style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('styleProfile')
      });
      expect(onSuccess).toHaveBeenCalledWith('Profile updated successfully!');
    });
  });

  it('displays physical analysis results', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          physicalProfile: mockProfileData.physicalProfile,
          analysisPhotos: mockProfileData.analysisPhotos
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Body Shape')).toBeInTheDocument();
      expect(screen.getByText('middle balance')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
      
      expect(screen.getByText('Color Palette')).toBeInTheDocument();
      expect(screen.getByText('Deep Winter')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 92%')).toBeInTheDocument();
    });
  });

  it('toggles photo visibility', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          physicalProfile: mockProfileData.physicalProfile,
          analysisPhotos: mockProfileData.analysisPhotos
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Show Photos')).toBeInTheDocument();
    });

    // Click show photos
    await user.click(screen.getByText('Show Photos'));

    await waitFor(() => {
      expect(screen.getByText('Hide Photos')).toBeInTheDocument();
      expect(screen.getByText('Analysis Photos (Private)')).toBeInTheDocument();
      expect(screen.getByAltText('Body shape analysis')).toBeInTheDocument();
      expect(screen.getByAltText('Color palette analysis')).toBeInTheDocument();
    });
  });

  it('allows editing preferences', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: mockProfileData.preferences,
          climateInfo: mockProfileData.climateInfo
        })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('10001')).toBeInTheDocument();
      expect(screen.getByText('$200')).toBeInTheDocument();
    });

    // Click edit preferences
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Should show input fields
    await waitFor(() => {
      const zipInput = screen.getByPlaceholderText('Enter zip code');
      const budgetInput = screen.getByPlaceholderText('Maximum budget per item');
      
      expect(zipInput).toHaveValue('10001');
      expect(budgetInput).toHaveValue(200);
    });
  });

  it('exports profile data', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: mockProfileData.physicalProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockProfileData.preferences })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Export Profile')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Export Profile'));

    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/style-profile-\d{4}-\d{2}-\d{2}\.json/);
  });

  it('handles API errors gracefully', async () => {
    const onError = jest.fn();
    
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<ProfileManagement onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to load profile data. Please try again.');
    });
  });

  it('refreshes profile data', async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response)
      // Second set of calls for refresh
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ styleProfile: mockProfileData.styleProfile })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ physicalProfile: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null })
      } as Response);

    render(<ProfileManagement />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Refresh'));

    // Should make API calls again
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh
    });
  });

  it('shows loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProfileManagement />);

    expect(screen.getByText('Loading your profile...')).toBeInTheDocument();
  });
});