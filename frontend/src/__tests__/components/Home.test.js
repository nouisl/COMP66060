import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../components/Home';

// mock react-moralis
jest.mock('react-moralis', () => ({
  useMoralis: () => ({
    account: null
  })
}));

// helper function to render with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Home Component', () => {
  // test welcome message
  test('renders welcome message', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('Welcome to')).toBeInTheDocument();
    expect(screen.getByText('Docu³')).toBeInTheDocument();
  });

  // test main heading
  test('renders main heading', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText(/The decentralized document signing platform/i)).toBeInTheDocument();
  });

  // test get started link when not connected
  test('renders Get Started link when not connected', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('View Documents')).toBeInTheDocument();
  });

  // test features section
  test('renders features section', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('Secure Signing')).toBeInTheDocument();
    expect(screen.getByText('Decentralized')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  // test how it works section
  test('renders how it works section', () => {
    renderWithRouter(<Home />);
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('Add Signers')).toBeInTheDocument();
  });
}); 