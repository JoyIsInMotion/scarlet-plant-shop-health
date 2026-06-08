import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '@/app/register';
import { ApiError } from '@/lib/api';
import { useRouter, Redirect } from 'expo-router';

jest.mock('@/context/auth', () => ({ useAuth: jest.fn() }));
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
  return { isAuthenticated: false, isLoading: false, register: jest.fn(), ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue(defaultAuth());
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering', () => {
  it('shows Name, Email, and Password fields', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    expect(getByPlaceholderText('Name')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText(/min. 8/i)).toBeTruthy();
  });

  it('shows the Create account button', () => {
    const { getByText } = render(<RegisterScreen />);
    expect(getByText('Create account')).toBeTruthy();
  });

  it('redirects to home when already authenticated', () => {
    mockUseAuth.mockReturnValue(defaultAuth({ isAuthenticated: true }));
    render(<RegisterScreen />);
    const [firstCallProps] = MockRedirect.mock.calls[0];
    expect(firstCallProps).toMatchObject({ href: '/' });
  });
});

// ─── Form validation ─────────────────────────────────────────────────────────

describe('form validation', () => {
  it('rejects a name shorter than 2 characters', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'A');
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'password1');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(getByText(/at least 2/i)).toBeTruthy());
  });

  it('rejects an invalid email', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Email'), 'not-valid');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'password1');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(getByText(/valid email/i)).toBeTruthy());
  });

  it('rejects a password shorter than 8 characters', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Email'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'short');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(getByText(/at least 8/i)).toBeTruthy());
  });

  it('accepts a name with exactly 2 characters', async () => {
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(defaultAuth({ register: mockRegister }));
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'AB');
    fireEvent.changeText(getByPlaceholderText('Email'), 'ab@example.com');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'password1');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
  });
});

// ─── Submission ───────────────────────────────────────────────────────────────

describe('submission', () => {
  it('calls auth.register with trimmed name, email, password', async () => {
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(defaultAuth({ register: mockRegister }));
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), '  Alice  ');
    fireEvent.changeText(getByPlaceholderText('Email'), ' alice@example.com ');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'mypassword');
    fireEvent.press(getByText('Create account'));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('Alice', 'alice@example.com', 'mypassword')
    );
  });

  it('navigates to home on success', async () => {
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(defaultAuth({ register: mockRegister }));
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Email'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'mypassword');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('shows "Email already registered" on 409 conflict', async () => {
    const mockRegister = jest
      .fn()
      .mockRejectedValue(new ApiError('Email already registered', 409));
    mockUseAuth.mockReturnValue(defaultAuth({ register: mockRegister }));
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Email'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'mypassword');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(getByText('Email already registered')).toBeTruthy());
  });

  it('shows a generic error message on unexpected failures', async () => {
    const mockRegister = jest.fn().mockRejectedValue(new Error('Network'));
    mockUseAuth.mockReturnValue(defaultAuth({ register: mockRegister }));
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText('Name'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('Email'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText(/min. 8/i), 'mypassword');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => expect(getByText(/something went wrong/i)).toBeTruthy());
  });
});
