import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MoralisProvider } from 'react-moralis';
import DocumentList from '../../components/DocumentList';

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
  isAddress: jest.fn(() => true)
}));

// mock web3uikit
jest.mock('@web3uikit/core', () => ({
  useNotification: () => jest.fn()
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

describe('DocumentList Component', () => {
  beforeEach(() => {
    // reset mocks
    jest.clearAllMocks();
    
    // default mock implementation
    mockUseMoralis.mockReturnValue({
      account: '0x1234567890123456789012345678901234567890',
      isAuthenticated: true
    });
  });

  // test basic component rendering
  test('renders component without crashing', () => {
    renderWithProviders(<DocumentList />);
    
    // Component should render without throwing errors
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  // test when not authenticated
  test('handles not authenticated state', () => {
    mockUseMoralis.mockReturnValue({
      account: null,
      isAuthenticated: false
    });

    renderWithProviders(<DocumentList />);
    
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });
}); 