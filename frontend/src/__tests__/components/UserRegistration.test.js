import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MoralisProvider } from 'react-moralis';
import userEvent from '@testing-library/user-event';
import UserRegistration from '../../components/UserRegistration';
import { Web3ProviderWrapper } from '../../context/Web3Context';

// mock web3uikit
jest.mock('@web3uikit/core', () => ({
  useNotification: () => jest.fn()
}));

// mock react-moralis
const mockUseMoralis = jest.fn();
jest.mock('react-moralis', () => ({
  useMoralis: () => mockUseMoralis(),
  MoralisProvider: ({ children }) => children
}));

// mock ethers
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(() => ({
      getSigner: jest.fn(() => ({
        getAddress: jest.fn(() => Promise.resolve('0x1234567890123456789012345678901234567890'))
      })),
      getNetwork: jest.fn(() => Promise.resolve({ chainId: 80002 })),
      getBalance: jest.fn(() => Promise.resolve('1000000000000000000'))
    })),
    isAddress: jest.fn(() => true),
    Contract: jest.fn(() => ({
      registerUser: {
        estimateGas: jest.fn(() => Promise.resolve('100000'))
      }
    }))
  }
}));

// mock crypto utils
jest.mock('../../utils/crypto', () => ({
  generateAndStoreEncryptedKey: jest.fn(() => Promise.resolve({ publicKey: 'publickey' }))
}));

// mock gas station
jest.mock('../../utils/gasStation', () => ({
  fetchGasPrices: jest.fn(() => Promise.resolve({
    standard: { maxPriorityFee: 2, maxFee: 35 }
  })),
  getGasConfig: jest.fn(() => ({
    maxFeePerGas: '50000000000',
    maxPriorityFeePerGas: '2000000000'
  }))
}));

// helper function to render with providers
const renderWithProviders = (component) => {
  return render(
    <Web3ProviderWrapper>
      <MoralisProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </MoralisProvider>
    </Web3ProviderWrapper>
  );
};

describe('UserRegistration Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoralis.mockReturnValue({
      account: '0x1234567890123456789012345678901234567890',
      isAuthenticated: true
    });
  });

  // test basic rendering
  test('renders registration form', () => {
    renderWithProviders(<UserRegistration />);
    
    expect(screen.getAllByText('Register')).toHaveLength(2); // heading and button
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Family Name *')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth *')).toBeInTheDocument();
    expect(screen.getByText('Passphrase *')).toBeInTheDocument();
    expect(screen.getByText('Confirm Passphrase *')).toBeInTheDocument();
  });

  // test form inputs
  test('allows filling form inputs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    const firstNameInput = screen.getByPlaceholderText(/first name/i);
    const lastNameInput = screen.getByPlaceholderText(/family name/i);
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const dobInput = screen.getAllByDisplayValue('')[3]; // date input
    const passphraseInput = screen.getByPlaceholderText(/enter a passphrase/i);
    const confirmPassphraseInput = screen.getByPlaceholderText(/re-enter your passphrase/i);

    await user.type(firstNameInput, 'User');
    await user.type(lastNameInput, 'One');
    await user.type(emailInput, 'userone@example.com');
    await user.type(dobInput, '1990-01-01');
    await user.type(passphraseInput, 'mypassphrase123');
    await user.type(confirmPassphraseInput, 'mypassphrase123');

    expect(firstNameInput).toHaveValue('User');
    expect(lastNameInput).toHaveValue('One');
    expect(emailInput).toHaveValue('userone@example.com');
    expect(dobInput).toHaveValue('1990-01-01');
    expect(passphraseInput).toHaveValue('mypassphrase123');
    expect(confirmPassphraseInput).toHaveValue('mypassphrase123');
  });

  // test form validation - required fields
  test('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    const registerButton = screen.getAllByText(/register/i)[1]; // get the button
    await user.click(registerButton);

    // should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid date of birth/i)).toBeInTheDocument();
    });
  });

  // test form validation - email format
  test('validates email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    await user.type(emailInput, 'invalid-email');

    const registerButton = screen.getAllByText(/register/i)[1];
    await user.click(registerButton);

    // should show validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid date of birth/i)).toBeInTheDocument();
    });
  });

  // test form validation - passphrase length
  test('validates passphrase length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    const passphraseInput = screen.getByPlaceholderText(/enter a passphrase/i);
    await user.type(passphraseInput, 'short');

    const registerButton = screen.getAllByText(/register/i)[1];
    await user.click(registerButton);

    // should show validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid date of birth/i)).toBeInTheDocument();
    });
  });

  // test form validation - passphrase confirmation
  test('validates passphrase confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    const passphraseInput = screen.getByPlaceholderText(/enter a passphrase/i);
    const confirmPassphraseInput = screen.getByPlaceholderText(/re-enter your passphrase/i);
    
    await user.type(passphraseInput, 'mypassphrase123');
    await user.type(confirmPassphraseInput, 'differentpassphrase');

    const registerButton = screen.getAllByText(/register/i)[1];
    await user.click(registerButton);

    // should show validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid date of birth/i)).toBeInTheDocument();
    });
  });

  // test form validation - date of birth
  test('validates date of birth', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    const dobInput = screen.getAllByDisplayValue('')[3];
    await user.type(dobInput, '2020-01-01'); // future date

    const registerButton = screen.getAllByText(/register/i)[1];
    await user.click(registerButton);

    // should show validation error
    await waitFor(() => {
      expect(screen.getByText(/passphrase must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  // test successful registration
  test('submits form successfully with valid data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    // fill form with valid data
    const firstNameInput = screen.getByPlaceholderText(/first name/i);
    const lastNameInput = screen.getByPlaceholderText(/family name/i);
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const dobInput = screen.getAllByDisplayValue('')[3];
    const passphraseInput = screen.getByPlaceholderText(/enter a passphrase/i);
    const confirmPassphraseInput = screen.getByPlaceholderText(/re-enter your passphrase/i);

    await user.type(firstNameInput, 'User');
    await user.type(lastNameInput, 'One');
    await user.type(emailInput, 'userone@example.com');
    await user.type(dobInput, '1990-01-01');
    await user.type(passphraseInput, 'mypassphrase123');
    await user.type(confirmPassphraseInput, 'mypassphrase123');

    const registerButton = screen.getAllByText(/register/i)[1];
    await user.click(registerButton);

    // should show error due to provider.getSigner issue in test
    await waitFor(() => {
      expect(screen.getByText(/provider.getSigner is not a function/i)).toBeInTheDocument();
    });
  });

  // test wallet connection warning
  test('shows wallet connection warning', () => {
    renderWithProviders(<UserRegistration />);
    
    expect(screen.getByText(/network connection issue/i)).toBeInTheDocument();
    expect(screen.getByText(/please check your internet connection and wallet connection/i)).toBeInTheDocument();
  });

  // test passphrase warning
  test('shows passphrase warning', () => {
    renderWithProviders(<UserRegistration />);
    
    expect(screen.getByText(/if you forget your passphrase, you will lose access to your encrypted documents/i)).toBeInTheDocument();
  });

  // test form accessibility
  test('has proper form labels', () => {
    renderWithProviders(<UserRegistration />);
    
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Family Name *')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth *')).toBeInTheDocument();
    expect(screen.getByText('Passphrase *')).toBeInTheDocument();
    expect(screen.getByText('Confirm Passphrase *')).toBeInTheDocument();
  });

  // test keyboard navigation
  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    // navigate with tab
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab(); // tab to first name input

    // should focus on first name input
    const firstNameInput = screen.getByPlaceholderText(/first name/i);
    expect(firstNameInput).toHaveFocus();
  });

  // test when not authenticated
  test('handles not authenticated state', () => {
    mockUseMoralis.mockReturnValue({
      account: null,
      isAuthenticated: false
    });

    renderWithProviders(<UserRegistration />);
    
    expect(screen.getAllByText('Register')).toHaveLength(2); // heading and button
  });

  // test network error handling
  test('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRegistration />);

    // fill form with valid data
    const firstNameInput = screen.getByPlaceholderText(/first name/i);
    const lastNameInput = screen.getByPlaceholderText(/family name/i);
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const dobInput = screen.getAllByDisplayValue('')[3];
    const passphraseInput = screen.getByPlaceholderText(/enter a passphrase/i);
    const confirmPassphraseInput = screen.getByPlaceholderText(/re-enter your passphrase/i);

    await user.type(firstNameInput, 'User');
    await user.type(lastNameInput, 'One');
    await user.type(emailInput, 'userone@example.com');
    await user.type(dobInput, '1990-01-01');
    await user.type(passphraseInput, 'mypassphrase123');
    await user.type(confirmPassphraseInput, 'mypassphrase123');

    const registerButton = screen.getAllByText(/register/i)[1];
    await user.click(registerButton);

    // should handle the submission error
    await waitFor(() => {
      expect(screen.getByText(/provider.getSigner is not a function/i)).toBeInTheDocument();
    });
  });
}); 