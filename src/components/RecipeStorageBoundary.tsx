import { Component, type ReactNode } from "react";
import { RecipeStorageError } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export class RecipeStorageBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error && !(error instanceof RecipeStorageError)) throw error;
    if (error) {
      return (
        <main className="mx-auto max-w-lg space-y-4 p-8" role="alert">
          <h1 className="text-xl font-semibold">Recipes could not be loaded</h1>
          <p>{error.message}</p>
          <Button onClick={() => this.setState({ error: null })}>Retry</Button>
        </main>
      );
    }
    return this.props.children;
  }
}
