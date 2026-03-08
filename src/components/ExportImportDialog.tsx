import { useState, useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { exportRecipesJSON, importRecipesFromJSON } from "@/lib/storage";
import { toast } from "sonner";

interface Props {
  onImported: () => void;
}

export function ExportImportDialog({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportRecipesJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bread-planner-recipes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recipes exported!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { added, skipped } = importRecipesFromJSON(reader.result as string);
        toast.success(`Imported ${added} recipe${added !== 1 ? "s" : ""}${skipped ? ` (${skipped} skipped)` : ""}`);
        onImported();
        setOpen(false);
      } catch {
        toast.error("Invalid JSON file — please check the format");
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-brass/20 hover:border-brass/50 hover:bg-brass/5 hover:text-foreground transition-base">
          <Download className="mr-1 h-4 w-4" />
          Backup
        </Button>
      </DialogTrigger>
      <DialogContent className="border-brass/20 glass-heavy max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gradient-brass">Backup & Restore</DialogTitle>
          <DialogDescription>
            Export your recipes as a JSON file, or import from a backup.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button variant="brass" onClick={handleExport} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Export All Recipes
          </Button>
          <div className="relative">
            <Button variant="ghost-neon" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import from JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center font-mono-tech">
            Duplicate recipes (same ID) are skipped on import.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
