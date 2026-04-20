import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-zinc-400">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-w-lg mx-auto text-left text-xs text-red-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-40">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack?.split("\n").slice(1, 5).join("\n")}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { window.location.href = "/"; }}
                className="rounded-lg bg-zinc-700 px-6 py-2 font-medium hover:bg-zinc-600 transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-emerald-600 px-6 py-2 font-medium hover:bg-emerald-500 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
