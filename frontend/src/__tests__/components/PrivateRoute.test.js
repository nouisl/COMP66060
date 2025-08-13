import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../../components/PrivateRoute';
import { Web3Context } from '../../context/Web3Context';

function renderWithContext(ui, { isRegistered }) {
  return render(
    <Web3Context.Provider value={{ walletConnected: true, setWalletConnected: () => {}, isRegistered, setIsRegistered: () => {} }}>
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/register" element={<div>Register Page</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    </Web3Context.Provider>
  );
}

describe('PrivateRoute', () => {
  test('redirects unauthenticated (unregistered) users to /register', () => {
    renderWithContext(
      <PrivateRoute>
        <div>Secret</div>
      </PrivateRoute>,
      { isRegistered: false }
    );
    expect(screen.getByText(/Register Page/i)).toBeInTheDocument();
  });

  test('renders children for registered users', () => {
    renderWithContext(
      <PrivateRoute>
        <div>Secret</div>
      </PrivateRoute>,
      { isRegistered: true }
    );
    expect(screen.getByText(/Secret/i)).toBeInTheDocument();
  });
});