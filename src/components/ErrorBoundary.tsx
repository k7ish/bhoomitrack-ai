import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { FirestoreErrorInfo } from '../lib/firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  firestoreDetails: FirestoreErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      firestoreDetails: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let firestoreDetails: FirestoreErrorInfo | null = null;
    let errorMessage = error.message || 'An unexpected application error occurred.';

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && 'operationType' in parsed) {
        firestoreDetails = parsed as FirestoreErrorInfo;
        errorMessage = parsed.error || 'Firestore permission or query error.';
      }
    } catch {
      // Standard error string
    }

    return {
      hasError: true,
      errorMessage,
      firestoreDetails,
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '', firestoreDetails: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">
                  System Exception Encountered
                </h2>
                <p className="mt-1 text-sm text-slate-600 break-words">
                  {this.state.errorMessage}
                </p>

                {this.state.firestoreDetails && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 space-y-1">
                    <div>Operation: {this.state.firestoreDetails.operationType}</div>
                    <div>Path: {this.state.firestoreDetails.path || 'N/A'}</div>
                    <div>
                      User: {this.state.firestoreDetails.authInfo?.email || 'Unauthenticated'}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reload Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
