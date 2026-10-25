'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PanelBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PanelBoundary] Isolated Panel Error caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#F2495C]/30 bg-[#11151C] p-6 text-center">
          <span className="text-2xl mb-2">⚠️</span>
          <h4 className="text-sm font-bold text-[#F2495C]">
            {this.props.fallbackTitle || 'Panel Unavailable'}
          </h4>
          <p className="mt-1 text-xs text-[#9AA6B5] max-w-sm">
            {this.state.error?.message || 'A data fetch or render error occurred in this module.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-lg border border-[#232A35] bg-[#181D26] px-3 py-1.5 text-xs font-semibold text-[#E8ECF2] hover:bg-[#232A35] transition-colors"
          >
            ↻ Retry Panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
