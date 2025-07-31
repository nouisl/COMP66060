import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../../components/Footer';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Footer Component', () => {
  test('renders footer with Docu3 branding', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Docu3')).toBeInTheDocument();
    expect(screen.getByText(/Decentralized document signing system/i)).toBeInTheDocument();
  });

  test('renders quick links section', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Quick Links')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('View Documents')).toBeInTheDocument();
  });

  test('renders resources section', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Polygon Network')).toBeInTheDocument();
    expect(screen.getByText('Polygon Amoy Explorer')).toBeInTheDocument();
    expect(screen.getByText('IPFS')).toBeInTheDocument();
  });

  test('renders copyright notice', () => {
    renderWithRouter(<Footer />);
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} Docu³. All rights reserved.`)).toBeInTheDocument();
  });

  test('renders all navigation links', () => {
    renderWithRouter(<Footer />);
    
    const homeLink = screen.getByText('Home').closest('a');
    const uploadLink = screen.getByText('Upload Document').closest('a');
    const documentsLink = screen.getByText('View Documents').closest('a');
    
    expect(homeLink).toHaveAttribute('href', '/');
    expect(uploadLink).toHaveAttribute('href', '/upload');
    expect(documentsLink).toHaveAttribute('href', '/documents');
  });

  test('renders external resource links', () => {
    renderWithRouter(<Footer />);
    
    const polygonLink = screen.getByText('Polygon Network').closest('a');
    const explorerLink = screen.getByText('Polygon Amoy Explorer').closest('a');
    const ipfsLink = screen.getByText('IPFS').closest('a');
    
    expect(polygonLink).toHaveAttribute('href', 'https://polygon.technology/');
    expect(explorerLink).toHaveAttribute('href', 'https://amoy.polygonscan.com/');
    expect(ipfsLink).toHaveAttribute('href', 'https://ipfs.io/');
    
    expect(polygonLink).toHaveAttribute('target', '_blank');
    expect(explorerLink).toHaveAttribute('target', '_blank');
    expect(ipfsLink).toHaveAttribute('target', '_blank');
  });
}); 