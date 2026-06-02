'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', this.props.label ?? 'unhandled', error, info);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="grid min-h-[60vh] place-items-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.error?.message ??
              'An unexpected error occurred. You can try again, or head back to your dashboard.'}
          </p>
          {this.props.label ? (
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {this.props.label}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={this.handleReset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
