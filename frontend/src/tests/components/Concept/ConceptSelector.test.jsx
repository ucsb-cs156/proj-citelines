import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ConceptSelector from "main/components/Concept/ConceptSelector";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import conceptsFixtures from "fixtures/conceptsFixtures";

const axiosMock = new AxiosMockAdapter(axios);

const renderConceptSelector = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ConceptSelector courseId={1} onSelect={() => {}} {...props} />
    </QueryClientProvider>,
  );
};

describe("ConceptSelector tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock
      .onGet("/api/concepts/top-level")
      .reply(200, conceptsFixtures.severalConcepts);
  });

  test("renders with default placeholder option", async () => {
    renderConceptSelector();
    expect(screen.getByText("-- Select a Concept --")).toBeInTheDocument();
  });

  test("renders with correct data-testid", async () => {
    renderConceptSelector({ testId: "my-selector" });
    expect(screen.getByTestId("my-selector")).toBeInTheDocument();
  });

  test("renders concept options after fetching", async () => {
    renderConceptSelector();
    expect(await screen.findByText("Variables")).toBeInTheDocument();
    expect(await screen.findByText("Loops")).toBeInTheDocument();
  });

  test("calls onSelect with the selected concept when a concept is chosen", async () => {
    const onSelect = vi.fn();
    renderConceptSelector({ onSelect });

    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("ConceptSelector"), {
      target: { value: "1" },
    });

    expect(onSelect).toHaveBeenCalledWith(conceptsFixtures.severalConcepts[0]);
  });

  test("calls onSelect with null when the empty option is selected", async () => {
    const onSelect = vi.fn();
    renderConceptSelector({ onSelect });

    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("ConceptSelector"), {
      target: { value: "" },
    });

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  test("calls onSelect with null when an unknown id is selected", async () => {
    const onSelect = vi.fn();
    renderConceptSelector({ onSelect });

    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("ConceptSelector"), {
      target: { value: "999" },
    });

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  test("renders empty selector when no concepts are available", async () => {
    axiosMock.onGet("/api/concepts/top-level").reply(200, []);
    renderConceptSelector({ courseId: 99 });

    const select = screen.getByTestId("ConceptSelector");
    expect(select.options).toHaveLength(1);
    expect(select.options[0].text).toBe("-- Select a Concept --");
  });

  test("renders each concept as a selectable option with correct testid", async () => {
    renderConceptSelector();

    await waitFor(() =>
      expect(
        screen.queryByTestId("ConceptSelector-option-1"),
      ).toBeInTheDocument(),
    );

    expect(screen.getByTestId("ConceptSelector-option-1")).toBeInTheDocument();
    expect(screen.getByTestId("ConceptSelector-option-2")).toBeInTheDocument();
  });
});
