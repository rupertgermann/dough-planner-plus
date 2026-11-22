import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InstallPWA } from "@/components/InstallPWA";

afterEach(() => vi.restoreAllMocks());

function offerInstall(outcome: "accepted" | "dismissed") {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome }),
  });
  act(() => { window.dispatchEvent(event); });
  return event;
}

it("waits for a browser prompt, permits retry after dismissal, and hides after installation", async () => {
  render(<InstallPWA />);
  expect(screen.queryByRole("button", { name: "Install App" })).not.toBeInTheDocument();

  const dismissed = offerInstall("dismissed");
  expect(dismissed.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Install App" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Install App" })).not.toBeInTheDocument());
  expect(dismissed.prompt).toHaveBeenCalledOnce();

  const accepted = offerInstall("accepted");
  fireEvent.click(screen.getByRole("button", { name: "Install App" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Install App" })).not.toBeInTheDocument());
  expect(accepted.prompt).toHaveBeenCalledOnce();
  offerInstall("dismissed");
  expect(screen.queryByRole("button", { name: "Install App" })).not.toBeInTheDocument();
});

it("shows manual installation instructions on iOS and hides them when already installed", () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
  const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
  const view = render(<InstallPWA />);
  fireEvent.click(screen.getByRole("button", { name: "Install App" }));
  expect(alert).toHaveBeenCalledExactlyOnceWith("Tap the Share button in Safari, then select 'Add to Home Screen' to install this app.");
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(screen.queryByRole("button", { name: "Install App" })).not.toBeInTheDocument();
  view.unmount();

  const matchMedia = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ ...matchMedia(query), matches: query === "(display-mode: standalone)" }));
  render(<InstallPWA />);
  expect(screen.queryByRole("button", { name: "Install App" })).not.toBeInTheDocument();
});
