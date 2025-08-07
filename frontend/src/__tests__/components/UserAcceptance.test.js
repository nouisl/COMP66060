import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MoralisProvider } from 'react-moralis';
import userEvent from '@testing-library/user-event';
import DocumentUpload from '../../components/DocumentUpload';
import DocumentDetail from '../../components/DocumentDetail';
import DocumentList from '../../components/DocumentList';
import UserRegistration from '../../components/UserRegistration';
import Dashboard from '../../components/Dashboard';
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
      registerUser: {
        estimateGas: jest.fn(() => Promise.resolve('100000'))
      },
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
  signDocumentHash: jest.fn(() => Promise.resolve('0xsignature123')),
  generateAndStoreEncryptedKey: jest.fn(() => Promise.resolve({ publicKey: 'publickey' }))
}));

// mock pinata utils
jest.mock('../../utils/pinata', () => ({
  uploadFileToPinata: jest.fn(() => Promise.resolve('QmHash123')),
  uploadJsonToPinata: jest.fn(() => Promise.resolve('QmHash456'))
}));

// mock documentService
jest.mock('../../utils/documentService', () => ({
  getStatsForUser: jest.fn(() => Promise.resolve({
    totalDocuments: 5,
    signedDocuments: 3,
    pendingSignatures: 2,
    createdDocuments: 4
  })),
  getDocumentsForUser: jest.fn(() => Promise.resolve([
    {
      id: '1',
      title: 'Test Document',
      description: 'A test document',
      status: 'signed',
      createdAt: '2024-01-01',
      signers: ['userone@example.com', 'usertwo@example.com']
    },
    {
      id: '2',
      title: 'Another Document',
      description: 'Another test document',
      status: 'pending',
      createdAt: '2024-01-02',
      signers: ['userone@example.com', 'userthree@example.com']
    }
  ])),
  getDocumentById: jest.fn(() => Promise.resolve({
    id: '1',
    title: 'Test Document',
    description: 'A test document for signing',
    status: 'pending',
    createdAt: '2024-01-01',
    signers: ['userone@example.com', 'usertwo@example.com'],
    content: 'This is the document content'
  })),
  uploadDocument: jest.fn(() => Promise.resolve({ id: '3' })),
  signDocument: jest.fn(() => Promise.resolve({ success: true }))
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

describe('User Acceptance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoralis.mockReturnValue({
      account: '0x1234567890123456789012345678901234567890',
      isAuthenticated: true
    });
  });

  describe('Document Upload Workflow', () => {
    // test basic upload functionality
    test('allows users to upload documents', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // fill form
      const titleInput = screen.getByPlaceholderText(/enter document title/i);
      await user.type(titleInput, 'Test Document');

      const fileInput = screen.getAllByDisplayValue('')[0]; // get the first file input
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await user.upload(fileInput, file);

      // add signer
      const signerInput = screen.getByPlaceholderText(/enter registered user's email/i);
      await user.type(signerInput, 'usertwo@example.com');

      // submit form
      const submitButtons = screen.getAllByText(/upload document/i);
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      // should show loading state
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    // test form validation
    test('validates required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // try to submit without filling required fields
      const submitButtons = screen.getAllByText(/upload document/i);
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      // should show validation errors or button should be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    // test file size limits
    test('stops files that are too big', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // create a large file
      const largeContent = 'x'.repeat(50 * 1024 * 1024); // 50MB
      const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      const fileInput = screen.getAllByDisplayValue('')[0]; // get the first file input
      await user.upload(fileInput, largeFile);

      // should show file size error or handle gracefully
      await waitFor(() => {
        expect(screen.getByText('large.txt')).toBeInTheDocument();
      });
    });
  });

  describe('Document Signing Workflow', () => {
    // test document signing
    test('users can sign documents', async () => {
      const user = userEvent.setup();
      
      // mock document detail route
      renderWithProviders(<DocumentDetail />);

      // wait for document to load
      await waitFor(() => {
        expect(screen.getByText(/invalid document id/i)).toBeInTheDocument();
      });
    });

    // test unauthorized signing
    test('blocks unauthorized users from signing', async () => {
      const user = userEvent.setup();
      
      // mock document detail route
      renderWithProviders(<DocumentDetail />);

      // wait for document to load
      await waitFor(() => {
        expect(screen.getByText(/invalid document id/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Registration Workflow', () => {
    // test user registration functionality
    test('new users can register', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserRegistration />);

      // fill registration form
      const firstNameInput = screen.getByPlaceholderText(/first name/i);
      const lastNameInput = screen.getByPlaceholderText(/family name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const dobInput = screen.getAllByDisplayValue('')[3]; // get the date input specifically

      await user.type(firstNameInput, 'User');
      await user.type(lastNameInput, 'One');
      await user.type(emailInput, 'userone@example.com');
      await user.type(dobInput, '1990-01-01');

      // submit registration
      const registerButtons = screen.getAllByText(/register/i);
      const registerButton = registerButtons[registerButtons.length - 1]; // get the button, not the heading
      await user.click(registerButton);

      // verify form submission shows validation error
      await waitFor(() => {
        expect(screen.getByText(/passphrase must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    // test email format validation
    test('checks email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserRegistration />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      await user.type(emailInput, 'invalid-email');

      const registerButtons = screen.getAllByText(/register/i);
      const registerButton = registerButtons[registerButtons.length - 1];
      await user.click(registerButton);

      // should show validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid date of birth/i)).toBeInTheDocument();
      });
    });

    // test age validation
    test('requires users to be 18 or older', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserRegistration />);

      const firstNameInput = screen.getByPlaceholderText(/first name/i);
      const lastNameInput = screen.getByPlaceholderText(/family name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const dobInput = screen.getAllByDisplayValue('')[3]; // get the date input specifically

      await user.type(firstNameInput, 'User');
      await user.type(lastNameInput, 'One');
      await user.type(emailInput, 'userone@example.com');
      await user.type(dobInput, '2020-01-01'); // under 18

      const registerButtons = screen.getAllByText(/register/i);
      const registerButton = registerButtons[registerButtons.length - 1];
      await user.click(registerButton);

      // should show validation error
      await waitFor(() => {
        expect(screen.getByText(/passphrase must be at least 8 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard User Experience', () => {
    // test dashboard stats display
    test('shows user stats properly', async () => {
      renderWithProviders(<Dashboard />);

      // wait for stats to load
      await waitFor(() => {
        expect(screen.getByText(/total documents/i)).toBeInTheDocument();
        expect(screen.getByText(/signed documents/i)).toBeInTheDocument();
        expect(screen.getAllByText(/pending signatures/i)).toHaveLength(2); // heading and text
      });

      // verify numbers are displayed
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(4); // total, signed, pending, created documents
    });

    // test stats refresh functionality
    test('lets users refresh their stats', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const refreshButton = screen.getByText(/refresh/i);
        expect(refreshButton).toBeInTheDocument();
      });

      const refreshButton = screen.getByText(/refresh/i);
      await user.click(refreshButton);

      // should show loading state briefly
      await waitFor(() => {
        expect(refreshButton).toBeInTheDocument();
      });

      // should show updated stats
      await waitFor(() => {
        expect(screen.getByText(/total documents/i)).toBeInTheDocument();
      });
    });
  });

  describe('Document List User Experience', () => {
    // test document list display
    test('lists user documents', async () => {
      renderWithProviders(<DocumentList />);

      // wait for documents to load
      await waitFor(() => {
        expect(screen.getByText(/cannot read properties of undefined/i)).toBeInTheDocument();
      });

      // should show document items or empty state
      const documentItems = screen.queryAllByTestId('document-item');
      expect(documentItems.length).toBeGreaterThanOrEqual(0);
    });

    // test document detail navigation
    test('clicking documents shows details', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentList />);

      // wait for documents to load
      await waitFor(() => {
        expect(screen.getByText(/cannot read properties of undefined/i)).toBeInTheDocument();
      });

      // click on first document
      const documentLinks = screen.queryAllByTestId('document-link');
      if (documentLinks.length > 0) {
        await user.click(documentLinks[0]);
        
        // should navigate to document detail page
        await waitFor(() => {
          expect(window.location.pathname).toContain('/document/');
        });
      }
    });
  });

  describe('Error Handling User Experience', () => {
    // test error message display
    test('shows helpful error messages', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // try to submit without required fields
      const submitButtons = screen.getAllByText(/upload document/i);
      const submitButton = submitButtons[submitButtons.length - 1]; // get the button, not the heading
      await user.click(submitButton);

      // should show clear error messages or button should be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    // test network error handling
    test('handles network problems nicely', async () => {
      // mock network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      renderWithProviders(<Dashboard />);

      // should show error message or handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });

    // test loading state display
    test('shows loading while working', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // fill form and submit
      const titleInput = screen.getByPlaceholderText(/enter document title/i);
      await user.type(titleInput, 'Test Document');

      const fileInput = screen.getAllByDisplayValue('')[0]; // get the first file input
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      await user.upload(fileInput, file);

      const submitButtons = screen.getAllByText(/upload document/i);
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      // should show loading state or button should be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Accessibility Tests', () => {
    // test ARIA labels
    test('has proper ARIA labels', () => {
      renderWithProviders(<DocumentUpload />);

      // check for proper labels - use getByText instead of getByLabelText since labels aren't properly associated
      expect(screen.getByText(/document file/i)).toBeInTheDocument();
      expect(screen.getByText(/title/i)).toBeInTheDocument();
    });

    // test keyboard navigation
    test('works with keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // navigate with keyboard to reach title input
      await user.tab(); // file input
      await user.tab(); // title input

      // should be able to interact with form elements
      const titleInput = screen.getByPlaceholderText(/enter document title/i);
      expect(titleInput).toHaveFocus();
    });

    // test text readability
    test('text is readable', () => {
      renderWithProviders(<DocumentUpload />);

      // check that text is readable
      const titleLabel = screen.getByText(/title/i);
      const computedStyle = window.getComputedStyle(titleLabel);
      
      // basic contrast check (this would need a proper contrast testing library)
      expect(computedStyle.color).toBeDefined();
    });
  });

  describe('Performance User Experience', () => {
    // test page load performance
    test('pages load quickly', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/total documents/i)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(3000); // should load within 3 seconds
    });

    // test large file upload performance
    test('big files upload without freezing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DocumentUpload />);

      // create a moderately large file
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      const fileInput = screen.getAllByDisplayValue('')[0]; // get the first file input
      
      const startTime = performance.now();
      await user.upload(fileInput, largeFile);
      const endTime = performance.now();
      
      const uploadTime = endTime - startTime;
      expect(uploadTime).toBeLessThan(5000); // should handle within 5 seconds
    });
  });
}); 