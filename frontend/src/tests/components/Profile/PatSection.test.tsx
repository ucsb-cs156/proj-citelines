import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { describe, test, expect, beforeEach, vi } from "vitest";

import PatSection from "main/components/Profile/PatSection";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  const originalModule = await importOriginal<object>();
  const toast = (x: unknown) => mockToast(x);
  toast.error = (x: unknown) => mockToast(x);
  return {
    ...originalModule,
    toast,
  };
});

const axiosMock = new AxiosMockAdapter(axios);

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PatSection
        title="GitHub PAT"
        endpoint="/api/pat/github"
        testIdPrefix="PatSection"
      />
    </QueryClientProvider>,
  );
}

describe("PatSection", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockClear();
  });

  test("shows 'No PAT set' when the backend has no token on file (404)", async () => {
    axiosMock.onGet("/api/pat/github").reply(404, {
      type: "EntityNotFoundException",
      message: "PatCredential with id 1 not found",
    });

    renderSection();

    expect(await screen.findByTestId("PatSection-status")).toHaveTextContent(
      "No PAT set",
    );
    expect(
      screen.getByText("GitHub PAT", { selector: "h2" }),
    ).toBeInTheDocument();
  });

  test("shows the masked PAT and expiration date when a PAT is set", async () => {
    axiosMock.onGet("/api/pat/github").reply(200, {
      id: 7,
      userId: 1,
      platform: "GITHUB",
      lastFour: "3f2a",
      expiresAt: "2026-12-31",
    });

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId("PatSection-status")).toHaveTextContent(
        "PAT: ******3f2a, expires: 2026-12-31",
      ),
    );
  });

  test("shows 'not specified' for the expiration date when it is null", async () => {
    axiosMock.onGet("/api/pat/github").reply(200, {
      id: 7,
      userId: 1,
      platform: "GITHUB",
      lastFour: "3f2a",
      expiresAt: null,
    });

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId("PatSection-status")).toHaveTextContent(
        "PAT: ******3f2a, expires: not specified",
      ),
    );
  });

  test("submits the form to the endpoint and shows a success toast", async () => {
    axiosMock.onGet("/api/pat/github").reply(404, {});
    axiosMock.onPost("/api/pat/github").reply(200, {
      id: 7,
      userId: 1,
      platform: "GITHUB",
      lastFour: "6789",
      expiresAt: null,
    });

    renderSection();

    await screen.findByTestId("PatSection-submit");

    fireEvent.change(screen.getByTestId("PatSection-token"), {
      target: { value: "******" },
    });
    fireEvent.click(screen.getByTestId("PatSection-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe("/api/pat/github");
    expect(axiosMock.history.post[0].params).toEqual({
      token: "******",
      expiresAt: undefined,
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("GitHub PAT saved"),
    );
  });

  test("passes the expiration date through when one is entered", async () => {
    axiosMock.onGet("/api/pat/github").reply(404, {});
    axiosMock.onPost("/api/pat/github").reply(200, {
      id: 7,
      userId: 1,
      platform: "GITHUB",
      lastFour: "6789",
      expiresAt: "2026-12-31",
    });

    renderSection();

    await screen.findByTestId("PatSection-submit");
    fireEvent.change(screen.getByTestId("PatSection-token"), {
      target: { value: "******" },
    });
    fireEvent.change(screen.getByTestId("PatSection-expiresAt"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.click(screen.getByTestId("PatSection-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      token: "******",
      expiresAt: "2026-12-31",
    });
  });

  test("shows the backend error message in a toast when the POST fails", async () => {
    axiosMock.onGet("/api/pat/github").reply(404, {});
    axiosMock.onPost("/api/pat/github").reply(400, {
      type: "IllegalArgumentException",
      message: "token is required",
    });

    renderSection();

    await screen.findByTestId("PatSection-submit");
    fireEvent.change(screen.getByTestId("PatSection-token"), {
      target: { value: "bad" },
    });
    fireEvent.click(screen.getByTestId("PatSection-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("token is required"),
    );
  });

  test("falls back to a generic error toast when the failure has no message", async () => {
    axiosMock.onGet("/api/pat/github").reply(404, {});
    axiosMock.onPost("/api/pat/github").networkError();

    renderSection();

    await screen.findByTestId("PatSection-submit");
    fireEvent.change(screen.getByTestId("PatSection-token"), {
      target: { value: "******" },
    });
    fireEvent.click(screen.getByTestId("PatSection-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Error saving GitHub PAT"),
    );
  });

  test("requires a token before submitting", async () => {
    axiosMock.onGet("/api/pat/github").reply(404, {});

    renderSection();

    await screen.findByTestId("PatSection-submit");
    fireEvent.click(screen.getByTestId("PatSection-submit"));

    await waitFor(() =>
      expect(screen.getByText("A GitHub PAT is required.")).toBeInTheDocument(),
    );
    expect(axiosMock.history.post.length).toBe(0);
  });
});
