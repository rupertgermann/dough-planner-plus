import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { toast, useToast } from "@/hooks/use-toast";

afterEach(() => vi.useRealTimers());

it("shares the latest notification, supports updates, and removes it after dismissal", async () => {
  vi.useFakeTimers();
  const first = renderHook(() => useToast());
  const second = renderHook(() => useToast());
  expect(first.result.current.toasts).toEqual([]);

  const previous = await act(async () => toast({ title: "Saving recipe" }));
  expect(second.result.current.toasts).toMatchObject([{ id: previous.id, title: "Saving recipe", open: true }]);
  const latest = await act(async () => first.result.current.toast({ title: "Recipe saved", description: "Stored on this device" }));
  expect(latest.id).not.toBe(previous.id);
  expect(first.result.current.toasts).toMatchObject([{ id: latest.id, title: "Recipe saved", open: true }]);
  expect(second.result.current.toasts).toEqual(first.result.current.toasts);

  act(() => previous.update({ id: previous.id, title: "Stale progress" }));
  expect(first.result.current.toasts[0].title).toBe("Recipe saved");
  act(() => latest.update({ id: latest.id, title: "Ready to bake" }));
  expect(second.result.current.toasts).toMatchObject([{ title: "Ready to bake", description: "Stored on this device", open: true }]);
  act(() => first.result.current.dismiss(previous.id));
  expect(second.result.current.toasts[0].open).toBe(true);

  act(() => second.result.current.toasts[0].onOpenChange?.(true));
  expect(second.result.current.toasts[0].open).toBe(true);
  act(() => second.result.current.toasts[0].onOpenChange?.(false));
  expect(first.result.current.toasts[0].open).toBe(false);
  act(() => latest.dismiss());
  expect(vi.getTimerCount()).toBe(2);
  act(() => vi.advanceTimersByTime(1_000_000));
  expect(first.result.current.toasts).toEqual([]);
  expect(second.result.current.toasts).toEqual([]);

  first.unmount();
  const next = await act(async () => toast({ title: "New batch" }));
  expect(second.result.current.toasts).toMatchObject([{ id: next.id, title: "New batch", open: true }]);
  act(() => second.result.current.dismiss());
  expect(second.result.current.toasts[0].open).toBe(false);
  act(() => vi.runAllTimers());
  expect(second.result.current.toasts).toEqual([]);
});
