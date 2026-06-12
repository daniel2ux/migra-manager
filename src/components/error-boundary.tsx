"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    
    // Auto-reload on ChunkLoadError
    if (error.name === 'ChunkLoadError' || 
        error.message?.includes('chunk') || 
        error.message?.includes('Loading chunk')) {
      console.warn("ChunkLoadError detected. Reloading page...");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-slate-50">
          <div className="bg-white border border-slate-200 shadow-xs p-8 max-w-md w-full text-center space-y-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Algo deu errado
            </p>
            {this.state.message && (
              <p className="text-[9px] text-slate-400 font-mono bg-slate-50 border border-slate-100 p-2 text-left break-all">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="px-6 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-300 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
