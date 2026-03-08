import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  // Already installed or no prompt available (iOS doesn't support beforeinstallprompt)
  if (installed) return null;

  // If no deferred prompt, show iOS instructions
  if (!deferredPrompt) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return null;

    return (
      <Button
        variant="outline"
        size="sm"
        className="border-brass/20 hover:border-brass/50 hover:bg-brass/5 hover:text-foreground transition-base"
        onClick={() =>
          alert("Tap the Share button in Safari, then select 'Add to Home Screen' to install this app.")
        }
      >
        <Download className="mr-1 h-4 w-4" />
        Install App
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-brass/20 hover:border-brass/50 hover:bg-brass/5 hover:text-foreground transition-base"
      onClick={handleInstall}
    >
      <Download className="mr-1 h-4 w-4" />
      Install App
    </Button>
  );
}
