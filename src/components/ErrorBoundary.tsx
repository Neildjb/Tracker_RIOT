import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** Empêche qu'une erreur d'affichage (ex. un graphique) ne vide toute la page. */
export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[nexus] erreur d'affichage:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-loss/40 bg-loss/10 p-3 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {this.props.label ?? "Ce bloc n'a pas pu être affiché."}
        </div>
      );
    }
    return this.props.children;
  }
}
