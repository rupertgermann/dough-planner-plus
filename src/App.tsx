import { RecipeStorageBoundary } from "@/components/RecipeStorageBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import RecipeEditor from "./pages/RecipeEditor";
import RecipeDetail from "./pages/RecipeDetail";
import TimetableView from "./pages/TimetableView";
import ImportRecipe from "./pages/ImportRecipe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RecipeStorageBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/recipe/:id" element={<RecipeEditor />} />
              <Route path="/view/:id" element={<RecipeDetail />} />
              <Route path="/timetable/:id" element={<TimetableView />} />
              <Route path="/import" element={<ImportRecipe />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RecipeStorageBoundary>
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t px-4 py-4 text-sm text-muted-foreground print:hidden">
          <span>Support Dough Planner Plus</span>
          <a href="https://patreon.com/rupertgermann" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            Patreon
          </a>
          <a href="https://buymeacoffee.com/rupertgermann" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            Buy Me a Coffee
          </a>
        </footer>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
