/**
 * Error Boundary for the admin panel.
 * Catches any React render error so the sidebar + layout stay visible.
 * Shows dev-mode details in development, clean message in production.
 */
import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AdminErrorBoundary] Unhandled render error:', error);
    console.error('[AdminErrorBoundary] Component stack:', info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 max-w-lg w-full space-y-5">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Une erreur s'est produite
            </h2>
            <p className="text-sm text-muted-foreground">
              Le chargement de cette page a échoué. Essayez de rafraîchir ou revenez au tableau de bord.
            </p>
          </div>

          {isDev && this.state.error && (
            <details className="text-left">
              <summary className="cursor-pointer text-xs font-semibold text-destructive/70 hover:text-destructive transition-colors">
                Détails de l'erreur (dev)
              </summary>
              <pre className="mt-2 text-xs bg-muted rounded-lg p-3 overflow-auto max-h-40 text-destructive/80 whitespace-pre-wrap break-all">
                {this.state.error.message}
                {this.state.componentStack && '\n\nComponent stack:' + this.state.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button
              size="sm"
              onClick={() => { window.location.href = '/admin'; }}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
