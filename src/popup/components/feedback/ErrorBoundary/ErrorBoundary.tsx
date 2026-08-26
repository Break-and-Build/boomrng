import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[boomrng] ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
