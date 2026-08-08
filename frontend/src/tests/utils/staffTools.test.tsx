import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { type ReactNode } from "react";
import { StaffToolsProvider } from "main/utils/staffTools";
import { useStaffTools } from "main/utils/useStaffTools";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import Footer from "main/components/Nav/Footer";

function makeWrapper(currentUser: object) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["current user"], currentUser);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <StaffToolsProvider>{children}</StaffToolsProvider>
      </QueryClientProvider>
    );
  };
}

describe("staffTools utility tests", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("canUseStaffTools", () => {
    test("is false for a regular user", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.userOnly),
      });
      expect(result.current.canUseStaffTools).toBe(false);
    });

    test("is true for an admin user", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      expect(result.current.canUseStaffTools).toBe(true);
    });

    test("is true for an instructor user", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.instructorUser),
      });
      expect(result.current.canUseStaffTools).toBe(true);
    });

    test("is false when not logged in", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.notLoggedIn),
      });
      expect(result.current.canUseStaffTools).toBe(false);
    });
  });

  describe("toggles", () => {
    test("both default to false", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      expect(result.current.debugMode).toBe(false);
      expect(result.current.enableEditing).toBe(false);
    });

    test("setting one tool does not affect the other", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      act(() => {
        result.current.setStaffTool("enableEditing", true);
      });
      expect(result.current.enableEditing).toBe(true);
      expect(result.current.debugMode).toBe(false);
    });

    test("can be toggled on and back off", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      act(() => {
        result.current.setStaffTool("debugMode", true);
      });
      expect(result.current.debugMode).toBe(true);
      act(() => {
        result.current.setStaffTool("debugMode", false);
      });
      expect(result.current.debugMode).toBe(false);
    });

    test("persists both settings to sessionStorage as one JSON object", () => {
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      act(() => {
        result.current.setStaffTool("debugMode", true);
      });
      act(() => {
        result.current.setStaffTool("enableEditing", true);
      });
      expect(JSON.parse(sessionStorage.getItem("staffTools")!)).toEqual({
        debugMode: true,
        enableEditing: true,
      });
    });

    test("reads initial values from sessionStorage", () => {
      sessionStorage.setItem(
        "staffTools",
        JSON.stringify({ debugMode: true, enableEditing: true }),
      );
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      expect(result.current.debugMode).toBe(true);
      expect(result.current.enableEditing).toBe(true);
    });

    test("treats corrupt stored JSON as the defaults", () => {
      sessionStorage.setItem("staffTools", "not json{");
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      expect(result.current.debugMode).toBe(false);
      expect(result.current.enableEditing).toBe(false);
    });

    test("treats non-boolean stored values as false", () => {
      sessionStorage.setItem(
        "staffTools",
        JSON.stringify({ debugMode: "yes", enableEditing: 1 }),
      );
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      expect(result.current.debugMode).toBe(false);
      expect(result.current.enableEditing).toBe(false);
    });

    test("flags stay false for a regular user even if sessionStorage says true", () => {
      sessionStorage.setItem(
        "staffTools",
        JSON.stringify({ debugMode: true, enableEditing: true }),
      );
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.userOnly),
      });
      expect(result.current.debugMode).toBe(false);
      expect(result.current.enableEditing).toBe(false);
    });
  });

  describe("sessionStorage unavailable", () => {
    // e.g. Safari private browsing or storage blocked by browser settings:
    // the toggles should still work for the current page load, just without
    // persistence.
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("defaults to off when sessionStorage.getItem throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage blocked");
      });
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      expect(result.current.debugMode).toBe(false);
      expect(result.current.enableEditing).toBe(false);
    });

    test("still toggles in-memory when sessionStorage.setItem throws", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("storage blocked");
      });
      const { result } = renderHook(() => useStaffTools(), {
        wrapper: makeWrapper(currentUserFixtures.adminUser),
      });
      act(() => {
        result.current.setStaffTool("debugMode", true);
      });
      expect(result.current.debugMode).toBe(true);
    });
  });

  describe("useStaffTools default context", () => {
    test("returns default values when used outside a provider", () => {
      const { result } = renderHook(() => useStaffTools());
      expect(result.current.debugMode).toBe(false);
      expect(result.current.enableEditing).toBe(false);
      expect(result.current.canUseStaffTools).toBe(false);
      expect(typeof result.current.setStaffTool).toBe("function");
    });
  });
});

describe("Footer staff tool toggles", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  function renderFooterWithUser(currentUser: object) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    qc.setQueryData(["current user"], currentUser);
    render(
      <QueryClientProvider client={qc}>
        <StaffToolsProvider>
          <MemoryRouter>
            <Footer />
          </MemoryRouter>
        </StaffToolsProvider>
      </QueryClientProvider>,
    );
  }

  test("does not show either toggle for a regular user", () => {
    renderFooterWithUser(currentUserFixtures.userOnly);
    expect(screen.queryByTestId("debug-mode-toggle")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("enable-editing-toggle"),
    ).not.toBeInTheDocument();
  });

  test("does not show either toggle for a not-logged-in user", () => {
    renderFooterWithUser(currentUserFixtures.notLoggedIn);
    expect(screen.queryByTestId("debug-mode-toggle")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("enable-editing-toggle"),
    ).not.toBeInTheDocument();
  });

  test("does not show either toggle outside a StaffToolsProvider (non-graph pages)", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("debug-mode-toggle")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("enable-editing-toggle"),
    ).not.toBeInTheDocument();
  });

  test("shows both toggles for an admin user", () => {
    renderFooterWithUser(currentUserFixtures.adminUser);
    expect(screen.getByTestId("debug-mode-toggle")).toBeInTheDocument();
    expect(screen.getByText("Debug Mode")).toBeInTheDocument();
    expect(screen.getByTestId("enable-editing-toggle")).toBeInTheDocument();
    expect(screen.getByText("Enable Editing")).toBeInTheDocument();
  });

  test("shows both toggles for an instructor user", () => {
    renderFooterWithUser(currentUserFixtures.instructorUser);
    expect(screen.getByTestId("debug-mode-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("enable-editing-toggle")).toBeInTheDocument();
  });

  test("both toggles start unchecked", () => {
    renderFooterWithUser(currentUserFixtures.adminUser);
    expect(
      (screen.getByTestId("debug-mode-toggle") as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId("enable-editing-toggle") as HTMLInputElement).checked,
    ).toBe(false);
  });

  test("clicking each toggle enables just that tool", () => {
    renderFooterWithUser(currentUserFixtures.adminUser);
    const debugToggle = screen.getByTestId(
      "debug-mode-toggle",
    ) as HTMLInputElement;
    const enableEditingToggle = screen.getByTestId(
      "enable-editing-toggle",
    ) as HTMLInputElement;

    fireEvent.click(enableEditingToggle);
    expect(enableEditingToggle.checked).toBe(true);
    expect(debugToggle.checked).toBe(false);

    fireEvent.click(debugToggle);
    expect(debugToggle.checked).toBe(true);
    expect(enableEditingToggle.checked).toBe(true);
  });
});
