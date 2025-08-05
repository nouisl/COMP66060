import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignatureVerifier from '../../components/SignatureVerifier';

const mockDispatch = jest.fn();

// mock web3uikit
jest.mock('@web3uikit/core', () => ({
  useNotification: () => mockDispatch
}));

// mock crypto utils
jest.mock('../../utils/crypto', () => ({
  verifySignature: jest.fn()
}));

// helper function to render with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('SignatureVerifier Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // test signature verification form rendering
  test('renders signature verification form', () => {
    renderWithRouter(<SignatureVerifier />);
    
    expect(screen.getByText('Signature Verification Tool')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter the document hash (IPFS hash or file hash)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter the cryptographic signature')).toBeInTheDocument();
    expect(screen.getByText('Verify Signature')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  // test help sections rendering
  test('renders help sections', () => {
    renderWithRouter(<SignatureVerifier />);
    
    expect(screen.getByText('How to Use:')).toBeInTheDocument();
    expect(screen.getByText('Technical Details:')).toBeInTheDocument();
    expect(screen.getByText(/Enter the document hash/)).toBeInTheDocument();
    expect(screen.getByText(/Enter the signer's Ethereum address/)).toBeInTheDocument();
  });

  // test form input changes
  test('handles form input changes', () => {
    renderWithRouter(<SignatureVerifier />);
    
    const documentHashInput = screen.getByPlaceholderText('Enter the document hash (IPFS hash or file hash)');
    const signerAddressInput = screen.getByPlaceholderText('0x...');
    const signatureInput = screen.getByPlaceholderText('Enter the cryptographic signature');
    
    fireEvent.change(documentHashInput, { target: { value: '0x1234567890abcdef' } });
    fireEvent.change(signerAddressInput, { target: { value: '0xabcdef1234567890' } });
    fireEvent.change(signatureInput, { target: { value: '0xsignature123' } });
    
    expect(documentHashInput.value).toBe('0x1234567890abcdef');
    expect(signerAddressInput.value).toBe('0xabcdef1234567890');
    expect(signatureInput.value).toBe('0xsignature123');
  });

  // test verify button disabled state
  test('verify button is disabled when fields are empty', () => {
    renderWithRouter(<SignatureVerifier />);
    
    const verifyButton = screen.getByText('Verify Signature');
    expect(verifyButton).toBeDisabled();
  });

  // test verify button enabled state
  test('verify button is enabled when all fields are filled', () => {
    renderWithRouter(<SignatureVerifier />);
    
    const documentHashInput = screen.getByPlaceholderText('Enter the document hash (IPFS hash or file hash)');
    const signerAddressInput = screen.getByPlaceholderText('0x...');
    const signatureInput = screen.getByPlaceholderText('Enter the cryptographic signature');
    
    fireEvent.change(documentHashInput, { target: { value: '0x1234567890abcdef' } });
    fireEvent.change(signerAddressInput, { target: { value: '0xabcdef1234567890' } });
    fireEvent.change(signatureInput, { target: { value: '0xsignature123' } });
    
    const verifyButton = screen.getByText('Verify Signature');
    expect(verifyButton).not.toBeDisabled();
  });

  // test clear button functionality
  test('clear button resets all form fields', () => {
    renderWithRouter(<SignatureVerifier />);
    
    const documentHashInput = screen.getByPlaceholderText('Enter the document hash (IPFS hash or file hash)');
    const signerAddressInput = screen.getByPlaceholderText('0x...');
    const signatureInput = screen.getByPlaceholderText('Enter the cryptographic signature');
    
    fireEvent.change(documentHashInput, { target: { value: '0x1234567890abcdef' } });
    fireEvent.change(signerAddressInput, { target: { value: '0xabcdef1234567890' } });
    fireEvent.change(signatureInput, { target: { value: '0xsignature123' } });
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(documentHashInput.value).toBe('');
    expect(signerAddressInput.value).toBe('');
    expect(signatureInput.value).toBe('');
  });

  // test valid signature verification
  test('shows success message for valid signature', async () => {
    const { verifySignature } = require('../../utils/crypto');
    verifySignature.mockReturnValue(true);
    
    renderWithRouter(<SignatureVerifier />);
    
    const documentHashInput = screen.getByPlaceholderText('Enter the document hash (IPFS hash or file hash)');
    const signerAddressInput = screen.getByPlaceholderText('0x...');
    const signatureInput = screen.getByPlaceholderText('Enter the cryptographic signature');
    
    fireEvent.change(documentHashInput, { target: { value: '0x1234567890abcdef' } });
    fireEvent.change(signerAddressInput, { target: { value: '0xabcdef1234567890' } });
    fireEvent.change(signatureInput, { target: { value: '0xsignature123' } });
    
    const verifyButton = screen.getByText('Verify Signature');
    fireEvent.click(verifyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Signature Valid')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  // test invalid signature verification
  test('shows error message for invalid signature', async () => {
    const { verifySignature } = require('../../utils/crypto');
    verifySignature.mockReturnValue(false);
    
    renderWithRouter(<SignatureVerifier />);
    
    const documentHashInput = screen.getByPlaceholderText('Enter the document hash (IPFS hash or file hash)');
    const signerAddressInput = screen.getByPlaceholderText('0x...');
    const signatureInput = screen.getByPlaceholderText('Enter the cryptographic signature');
    
    fireEvent.change(documentHashInput, { target: { value: '0x1234567890abcdef' } });
    fireEvent.change(signerAddressInput, { target: { value: '0xabcdef1234567890' } });
    fireEvent.change(signatureInput, { target: { value: '0xsignature123' } });
    
    const verifyButton = screen.getByText('Verify Signature');
    fireEvent.click(verifyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Signature Invalid')).toBeInTheDocument();
      expect(screen.getByText('✗')).toBeInTheDocument();
    });
  });
}); 