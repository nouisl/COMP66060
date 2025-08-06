// mock documentService
jest.mock('../../utils/documentService', () => ({
  documentService: {
    getStatsForUser: jest.fn(() => Promise.resolve({
      totalDocuments: 5,
      signedDocuments: 3,
      pendingSignatures: 2,
      createdDocuments: 4
    })),
    clearCache: jest.fn()
  }
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MoralisProvider } from 'react-moralis';
import Dashboard from '../../components/Dashboard';

// mock react-moralis
const mockUseMoralis = jest.fn();
jest.mock('react-moralis', () => ({
  useMoralis: () => mockUseMoralis(),
  MoralisProvider: ({ children }) => children
}));

// mock ethers
jest.mock('ethers', () => ({
  BrowserProvider: jest.fn(),
  Contract: jest.fn(),
  isAddress: jest.fn()
}));

// helper function to render with router and Moralis provider
const renderWithProviders = (component) => {
  return render(
    <MoralisProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </MoralisProvider>
  );
};

describe('Dashboard Component', () => {
  let mockDocumentService;

  beforeEach(() => {
    // reset mocks
    jest.clearAllMocks();
    
    // get the mocked documentService
    mockDocumentService = require('../../utils/documentService').documentService;
    
    // default mock implementation
    mockUseMoralis.mockReturnValue({
      account: '0x1234567890123456789012345678901234567890',
      isAuthenticated: true
    });

    // mock successful stats response
    mockDocumentService.getStatsForUser.mockResolvedValue({
      totalDocuments: 5,
      pendingSignatures: 2,
      signedDocuments: 3,
      createdDocuments: 2
    });
  });

  // test basic dashboard rendering
  test('renders dashboard title', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  // test dashboard renders when authenticated
  test('renders dashboard when authenticated', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  // test stats cards rendering
  test('renders stats cards', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Documents')).toBeInTheDocument();
      expect(screen.getByText('Pending Signatures')).toBeInTheDocument();
      expect(screen.getByText('Signed Documents')).toBeInTheDocument();
      expect(screen.getByText('Created Documents')).toBeInTheDocument();
    });
  });

  // test stats values display
  test('displays correct stats values', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // total docs
      expect(screen.getAllByText('2')).toHaveLength(2); // pending sigs and created docs
      expect(screen.getByText('3')).toBeInTheDocument(); // signed docs
    });
  });

  // test quick actions section
  test('renders quick actions section', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Upload New Document')).toBeInTheDocument();
      expect(screen.getByText('View All Documents')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  // test quick action links have correct href
  test('quick action links have correct href attributes', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      const uploadLink = screen.getByText('Upload New Document').closest('a');
      const documentsLink = screen.getByText('View All Documents').closest('a');
      
      expect(uploadLink).toHaveAttribute('href', '/upload');
      expect(documentsLink).toHaveAttribute('href', '/documents');
    });
  });

  // test loading state
  test('shows loading state initially', () => {
    // mock slow response
    mockDocumentService.getStatsForUser.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        totalDocuments: 5,
        pendingSignatures: 2,
        signedDocuments: 3,
        createdDocuments: 2
      }), 100))
    );

    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  // test error handling
  test('handles error gracefully when stats fetch fails', async () => {
    mockDocumentService.getStatsForUser.mockRejectedValue(new Error('Failed to fetch stats'));

    renderWithProviders(<Dashboard />);
    
    // Should not crash and should show dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  // test refresh functionality
  test('has refresh button', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  // test dashboard structure
  test('has correct dashboard structure', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      const dashboard = screen.getByText('Dashboard').closest('div').parentElement;
      expect(dashboard).toHaveClass('max-w-6xl', 'mx-auto', 'px-4');
    });
  });

  // test when not authenticated
  test('handles not authenticated state', async () => {
    mockUseMoralis.mockReturnValue({
      account: null,
      isAuthenticated: false
    });

    renderWithProviders(<Dashboard />);
    
    // When not authenticated, it should still show loading initially
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });
}); 