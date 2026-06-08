import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/login';
import { ApiError } from '@/lib/api';
import { useRouter, Redirect } from 'expo-router';
import { m } from '../utils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/i18n', () => ({
  useI18n: jest.fn(() => ({ locale: 'en', m: require('../utils').m })),
  pickLocalized: jest.fn((v: unknown) => (typeof v === 'string' ? v : null)),
}));

import { useAuth } from '@/context/auth';
const mockUseAuth = useAuth as jest.Mock;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
};
(useRouter as jest.Mock).mockReturnValue(mockRouter);
const MockRedirect = Redirect as jest.Mock;

function defaultAuth(overrides = {}) {
  return {
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue(defaultAuth());
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering', () => {
  it('shows the email and password inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('shows the Log in button', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Log in')).toBeTruthy();
  });

  it('shows a link to the register screen', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Create an account')).toBeTruthy();
  });

  it('redirects to home when the user is already authenticated', () => {
    mockUseAuth.mockReturnValue(defaultAuth({ isAuthenticated: true }));
    render(<LoginScreen />);
    const [firstCallProps] = MockRedirect.mock.calls[0];
    expect(firstCallProps).toMatchObject({ href: '/' });
  });
});

// ─── Form validation ─────────────────────────────────────────────────────────

describe('form validation', () => {
  it('shows an error when the email is invalid', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'not-an-email');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.press(getByText('Log in'));
    await waitFor(() => expect(getByText(/valid email/i)).toBeTruthy());
  });

  it('shows an error when the password is empty', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.press(getByText('Log in'));
    await waitFor(() => expect(getByText(/password/i)).toBeTruthy());
  });

  it('trims whitespace from the email before validating', async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(defaultAuth({ login: mockLogin }));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), '  user@example.com  ');
    fireEvent.changeText(getByPlaceholderText('Password'), 'pass');
    fireEvent.press(getByText('Log in'));
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'pass')
    );
  });
});

// ─── Submission ───────────────────────────────────────────────────────────────

describe('submission', () => {
  it('calls auth.login with email and password on valid submit', async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(defaultAuth({ login: mockLogin }));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'secret123');
    fireEvent.press(getByText('Log in'));
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123')
    );
  });

  it('navigates to home on successful login', async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(defaultAuth({ login: mockLogin }));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'secret');
    fireEvent.press(getByText('Log in'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('shows the API error message when login fails', async () => {
    const mockLogin = jest
      .fn()
      .mockRejectedValue(new ApiError('Invalid credentials', 401));
    mockUseAuth.mockReturnValue(defaultAuth({ login: mockLogin }));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByText('Log in'));
    await waitFor(() => expect(getByText('Invalid credentials')).toBeTruthy());
  });

  it('shows a generic message when a non-ApiError is thrown', async () => {
    const mockLogin = jest.fn().mockRejectedValue(new Error('Network'));
    mockUseAuth.mockReturnValue(defaultAuth({ login: mockLogin }));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'pass');
    fireEvent.press(getByText('Log in'));
    await waitFor(() => expect(getByText(/something went wrong/i)).toBeTruthy());
  });

  it('disables the submit button while the request is in-flight', async () => {
    let resolve: () => void;
    const mockLogin = jest.fn(
      () => new Promise<void>((r) => { resolve = r; })
    );
    mockUseAuth.mockReturnValue(defaultAuth({ login: mockLogin }));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'pass');
    fireEvent.press(getByText('Log in'));
    // After pressing, the button shows a spinner — second press attempt is a no-op.
    try { fireEvent.press(getByText('Log in')); } catch { /* spinner replaced button text */ }
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    resolve!();
  });
});
