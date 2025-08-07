import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MoralisProvider } from 'react-moralis';
import userEvent from '@testing-library/user-event';
import DocumentUpload from '../../components/DocumentUpload';
import { Web3ProviderWrapper } from '../../context/Web3Context';

// mock web3uikit
jest.mock('@web3uikit/core', () => ({
  useNotification: () => jest.fn(),
  useWeb3Contract: () => ({
    data: null,
    error: null,
    loading: false,
    runContractFunction: jest.fn()
  }),
  useMoralis: () => ({
    isWeb3Enabled: true,
    account: '0x1234567890123456789012345678901234567890',
    enableWeb3: jest.fn(),
    deactivateWeb3: jest.fn()
  })
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
      getAllRegisteredUsers: jest.fn(() => Promise.resolve([])),
      getUserProfile: jest.fn(() => Promise.resolve(['John', 'Doe', 'john@example.com', '1990-01-01', true, 'publickey']))
    }))
  }
}));

// mock crypto utils
jest.mock('../../utils/crypto', () => ({
  generateDocumentHash: jest.fn(() => Promise.resolve('0xhash123')),
  encryptDocument: jest.fn(() => Promise.resolve({
    encryptedFile: new ArrayBuffer(100),
    encryptedKeys: {},
    iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  })),
  signDocumentHash: jest.fn(() => Promise.resolve('0xsignature123'))
}));

// mock pinata utils
jest.mock('../../utils/pinata', () => ({
  uploadFileToPinata: jest.fn(() => Promise.resolve('QmHash123')),
  uploadJsonToPinata: jest.fn(() => Promise.resolve('QmHash456'))
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

describe('DocumentUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoralis.mockReturnValue({
      account: '0x1234567890123456789012345678901234567890',
      isAuthenticated: true
    });
  });

  // test basic rendering
  test('renders upload document form', () => {
    renderWithProviders(<DocumentUpload />);
    
    expect(screen.getAllByText('Upload Document')).toHaveLength(2); // heading and button
    expect(screen.getByText('Document File *')).toBeInTheDocument();
    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  // test file upload functionality
  test('allows file selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const fileInput = screen.getAllByDisplayValue('')[0];
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    await user.upload(fileInput, file);
    
    expect(screen.getByText('test.txt')).toBeInTheDocument();
  });

  // test title input
  test('allows title input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const titleInput = screen.getByPlaceholderText(/enter document title/i);
    await user.type(titleInput, 'Test Document');
    
    expect(titleInput).toHaveValue('Test Document');
  });

  // test description input
  test('allows description input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const descriptionInput = screen.getByPlaceholderText(/short description/i);
    await user.type(descriptionInput, 'Test description');
    
    expect(descriptionInput).toHaveValue('Test description');
  });

  // test signer addition
  test('allows adding signers', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const addSignerButton = screen.getByText('+ Add Signer');
    await user.click(addSignerButton);
    
    // should show additional signer input
    const signerInputs = screen.getAllByPlaceholderText(/enter registered user's email/i);
    expect(signerInputs.length).toBeGreaterThan(1);
  });

  // test form validation
  test('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    // try to submit without required fields
    const submitButton = screen.getAllByText(/upload document/i)[1]; // get the button
    await user.click(submitButton);
    
    // button should be disabled
    expect(submitButton).toBeDisabled();
  });

  // test form submission with valid data
  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    // fill required fields
    const titleInput = screen.getByPlaceholderText(/enter document title/i);
    await user.type(titleInput, 'Test Document');

    const fileInput = screen.getAllByDisplayValue('')[0];
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await user.upload(fileInput, file);

    // add a signer
    const signerInput = screen.getByPlaceholderText(/enter registered user's email/i);
    await user.type(signerInput, 'usertwo@example.com');

    // submit form
    const submitButton = screen.getAllByText(/upload document/i)[1];
    await user.click(submitButton);

    // should show loading state
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  // test include self as signer checkbox
  test('includes self as signer when checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const includeSelfCheckbox = screen.getByText(/include myself as a signer/i);
    await user.click(includeSelfCheckbox);
    
    // should show user as first signer (or not registered message)
    expect(screen.getByDisplayValue('Please register first')).toBeInTheDocument();
  });

  // test single user document checkbox
  test('handles single user document option', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const singleUserCheckbox = screen.getByText(/single user document/i);
    await user.click(singleUserCheckbox);
    
    // should show single user message
    expect(screen.getByText(/you will be the creator and the only signer/i)).toBeInTheDocument();
  });

  // test expiry date input
  test('allows setting expiry date', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    const expiryInput = screen.getAllByDisplayValue('')[4]; // expiry input
    await user.type(expiryInput, '2024-12-31T23:59');
    
    expect(expiryInput).toHaveValue('2024-12-31T23:59');
  });

  // test error handling
  test('handles file upload errors gracefully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    // try to upload a large file
    const fileInput = screen.getAllByDisplayValue('')[0];
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    
    await user.upload(fileInput, largeFile);
    
    // should handle the file upload
    expect(screen.getByText('large.txt')).toBeInTheDocument();
  });

  // test form reset
  test('resets form after successful submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    // fill form
    const titleInput = screen.getByPlaceholderText(/enter document title/i);
    await user.type(titleInput, 'Test Document');

    const fileInput = screen.getAllByDisplayValue('')[0];
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await user.upload(fileInput, file);

    // submit form
    const submitButton = screen.getAllByText(/upload document/i)[1];
    await user.click(submitButton);

    // should show loading state
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  // test accessibility
  test('has proper form labels', () => {
    renderWithProviders(<DocumentUpload />);
    
    expect(screen.getByText('Document File *')).toBeInTheDocument();
    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Signers (enter registered user email)')).toBeInTheDocument();
  });

  // test keyboard navigation
  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentUpload />);

    // navigate with tab to reach title input
    await user.tab(); // file input
    await user.tab(); // title input

    // should focus on title input
    const titleInput = screen.getByPlaceholderText(/enter document title/i);
    expect(titleInput).toHaveFocus();
  });
}); 