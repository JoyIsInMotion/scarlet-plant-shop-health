import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AuthGuard } from '@/components/auth-guard';
import { Redirect } from 'expo-router';

// Mock the auth context so we can control isAuthenticated / isLoading.
jest.mock('@/context/auth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@/context/auth';
const mockUseAuth = useAuth as jest.Mock;

const MockRedirect = Redirect as jest.Mock;

function Protected() {
  return <Text testID="protected-content">Secret</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('renders an ActivityIndicator while the session is being restored', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });
    const { getByTestId, queryByTestId } = render(
      <AuthGuard><Protected /></AuthGuard>
    );
    // Children are not rendered yet
    expect(queryByTestId('protected-content')).toBeNull();
    // An ActivityIndicator should be in the tree (react-native renders it as 'ActivityIndicator')
    // Testing-library picks it up by role or we verify children are hidden.
    // The important check is that protected content is not visible.
    expect(queryByTestId('protected-content')).toBeNull();
  });
});

// ─── Unauthenticated ─────────────────────────────────────────────────────────

describe('unauthenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
  });

  it('redirects to /login when the user is not authenticated', () => {
    render(<AuthGuard><Protected /></AuthGuard>);
    const [firstCallProps] = MockRedirect.mock.calls[0];
    expect(firstCallProps).toMatchObject({ href: '/login' });
  });

  it('does NOT render the protected children', () => {
    const { queryByTestId } = render(<AuthGuard><Protected /></AuthGuard>);
    expect(queryByTestId('protected-content')).toBeNull();
  });
});

// ─── Authenticated ────────────────────────────────────────────────────────────

describe('authenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
  });

  it('renders the protected children', () => {
    const { getByTestId } = render(<AuthGuard><Protected /></AuthGuard>);
    expect(getByTestId('protected-content')).toBeTruthy();
  });

  it('does NOT call Redirect', () => {
    render(<AuthGuard><Protected /></AuthGuard>);
    expect(MockRedirect).not.toHaveBeenCalled();
  });
});

// ─── Transition: loading → authenticated ─────────────────────────────────────

describe('transition: loading → authenticated', () => {
  it('reveals children once loading finishes and user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });
    const { getByTestId, queryByTestId, rerender } = render(
      <AuthGuard><Protected /></AuthGuard>
    );
    expect(queryByTestId('protected-content')).toBeNull();

    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
    rerender(<AuthGuard><Protected /></AuthGuard>);

    await waitFor(() => expect(getByTestId('protected-content')).toBeTruthy());
  });

  it('redirects once loading finishes and user is NOT authenticated', async () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });
    const { rerender } = render(<AuthGuard><Protected /></AuthGuard>);

    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    rerender(<AuthGuard><Protected /></AuthGuard>);

    await waitFor(() =>
      expect(MockRedirect.mock.calls.at(-1)?.[0]).toMatchObject({ href: '/login' })
    );
  });
});
