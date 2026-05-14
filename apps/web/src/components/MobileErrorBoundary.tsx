"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Also log to window for easy access
    if (typeof window !== 'undefined') {
        (window as any).lastError = { error: error.toString(), stack: error.stack, info: errorInfo };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[10000] bg-[#05080c] text-white p-6 overflow-auto flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-black mb-2 uppercase tracking-widest text-red-400">Neural Sync Failure</h1>
          <p className="text-sm text-white/60 mb-8 max-w-xs">The sanctuary's client-side core has encountered an unhandled exception.</p>
          
          <div className="w-full max-w-md bg-black/40 border border-white/10 rounded-2xl p-4 text-left mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Error Diagnostic</p>
            <div className="font-mono text-xs text-red-300 break-words whitespace-pre-wrap max-h-48 overflow-y-auto p-2 bg-red-500/5 rounded-lg border border-red-500/10">
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-[#84ccb9] text-black rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(132,204,185,0.2)]"
          >
            Attempt Re-Sync
          </button>
          
          <p className="mt-8 text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">StudyBuddy Mobile Diagnostic v1.0</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;
