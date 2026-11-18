import { createRef } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { afterEach, expect, it, vi } from "vitest";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

afterEach(() => vi.restoreAllMocks());

it("remembers the selected theme across mounts and can switch it back", async () => {
  const previousClassName = document.documentElement.className;
  const previousTheme = localStorage.getItem("theme");
  localStorage.removeItem("theme");
  const open = () => render(<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <ThemeToggle />
  </ThemeProvider>);
  try {
    const first = open();
    await waitFor(() => expect(document.documentElement).toHaveClass("light"));
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(localStorage.getItem("theme")).toBe("dark");
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    first.unmount();

    open();
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(localStorage.getItem("theme")).toBe("light");
    await waitFor(() => expect(document.documentElement).toHaveClass("light"));
  } finally {
    document.documentElement.className = previousClassName;
    if (previousTheme === null) localStorage.removeItem("theme");
    else localStorage.setItem("theme", previousTheme);
  }
});

it("switches at the mobile breakpoint and unsubscribes on unmount", () => {
  const previousWidth = window.innerWidth;
  const events = new EventTarget();
  const add = vi.spyOn(events, "addEventListener");
  const remove = vi.spyOn(events, "removeEventListener");
  const matchMedia = window.matchMedia;
  const query = vi.spyOn(window, "matchMedia").mockImplementation((value) => ({
    ...matchMedia(value), addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  }));
  try {
    window.innerWidth = 767;
    const mobile = renderHook(() => useIsMobile());
    expect(query).toHaveBeenCalledExactlyOnceWith("(max-width: 767px)");
    expect(mobile.result.current).toBe(true);
    window.innerWidth = 768;
    act(() => { events.dispatchEvent(new Event("change")); });
    expect(mobile.result.current).toBe(false);
    window.innerWidth = 500;
    act(() => { events.dispatchEvent(new Event("change")); });
    expect(mobile.result.current).toBe(true);
    mobile.unmount();
    expect(remove).toHaveBeenCalledExactlyOnceWith("change", add.mock.calls[0][1]);
  } finally {
    window.innerWidth = previousWidth;
  }
});

it("applies active and pending link styles during navigation and forwards its anchor ref", async () => {
  const libraryRef = createRef<HTMLAnchorElement>();
  let finish: () => void = () => {};
  const load = new Promise<null>((resolve) => { finish = () => resolve(null); });
  const router = createMemoryRouter([{
    path: "/", element: <>
      <NavLink ref={libraryRef} to="/" end className="navigation" activeClassName="current">Library</NavLink>
      <NavLink to="/import" className="navigation" activeClassName="current" pendingClassName="loading">Import</NavLink>
      <Outlet />
    </>, children: [
      { index: true, element: <h1>Saved recipes</h1> },
      { path: "import", loader: () => load, element: <h1>Import recipe</h1> },
    ],
  }]);
  render(<RouterProvider router={router} />);
  const library = screen.getByRole("link", { name: "Library" });
  const importLink = screen.getByRole("link", { name: "Import" });
  expect(libraryRef.current).toBe(library);
  expect(library).toHaveClass("navigation", "current");
  expect(importLink).toHaveClass("navigation");
  expect(importLink).not.toHaveClass("current");
  expect(importLink).not.toHaveClass("loading");

  fireEvent.click(importLink);
  expect(importLink).toHaveClass("navigation", "loading");
  expect(library).toHaveClass("current");
  await act(async () => { finish(); });
  expect(screen.getByRole("heading", { name: "Import recipe" })).toBeVisible();
  expect(importLink).toHaveClass("navigation", "current");
  expect(importLink).not.toHaveClass("loading");
  expect(library).not.toHaveClass("current");
});
