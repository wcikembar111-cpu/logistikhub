import * as React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-white border border-rose-200 rounded-2xl shadow-xs text-center my-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-3 shadow-2xs">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800 mb-1">
            {this.props.fallbackTitle || 'Gagal Memuat Modul'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
            {this.props.fallbackMessage || this.state.error?.message || 'Terjadi kendala saat merender tampilan menu ini.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Coba Muat Ulang</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Home size={14} />
              <span>Refresh Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
