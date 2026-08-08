import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SubConceptTabComponent from "main/components/Courses/TabComponent/SubConceptTabComponent";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import subConceptsFixtures from "fixtures/subConceptsFixtures";
import conceptsFixtures from "fixtures/conceptsFixtures";
import { vi } from "vitest";

vi.mock("react-simplemde-editor", () => ({
  default: ({ value = "", onChange }) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const mockToast = vi.fn();

vi.mock("react-toastify", async (importOriginal) => ({
  ...(await importOriginal()),
  toast: (value) => mockToast(value),
}));

const axiosMock = new AxiosMockAdapter(axios);

const renderSubConceptTabComponent = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <SubConceptTabComponent courseId={1} testIdPrefix="test" {...props} />
    </QueryClientProvider>,
  );
};

describe("SubConceptTabComponent tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    mockToast.mockClear();
    axiosMock
      .onGet("/api/concepts/subconcepts")
      .reply(200, subConceptsFixtures.severalSubConcepts);
    axiosMock
      .onGet("/api/concepts/top-level")
      .reply(200, conceptsFixtures.severalConcepts);
    axiosMock
      .onPost("/api/concept/subconcept")
      .reply((config) => [200, JSON.parse(config.data)]);
    axiosMock
      .onPut(/\/api\/concept\/subconcept\/put\?conceptId=.*/)
      .reply((config) => [200, JSON.parse(config.data)]);
    axiosMock.onDelete(/\/api\/concept\/delete\?conceptId=.*/).reply(200);
  });

  test("renders the SubConcepts heading", async () => {
    renderSubConceptTabComponent();
    expect(screen.getByText("SubConcepts")).toBeInTheDocument();
  });

  test("renders with correct data-testid", async () => {
    renderSubConceptTabComponent();
    expect(screen.getByTestId("test-subConceptTab")).toBeInTheDocument();
  });

  test("renders with custom testIdPrefix", async () => {
    renderSubConceptTabComponent({
      testIdPrefix: "InstructorCourseShowPage",
    });
    expect(
      screen.getByTestId("InstructorCourseShowPage-subConceptTab"),
    ).toBeInTheDocument();
  });

  test("renders subconcept table with fetched data", async () => {
    renderSubConceptTabComponent();
    expect(await screen.findByText("Declaring variables")).toBeInTheDocument();
    expect(await screen.findByText("Updating variables")).toBeInTheDocument();
  });

  test("renders concept selector", async () => {
    renderSubConceptTabComponent();
    expect(screen.getByTestId("test-conceptSelector")).toBeInTheDocument();
  });

  test("renders concept options in the selector", async () => {
    renderSubConceptTabComponent();
    expect(await screen.findByText("Variables")).toBeInTheDocument();
    expect(await screen.findByText("Loops")).toBeInTheDocument();
  });

  test("Create SubConcept button is disabled when no concept is selected", async () => {
    renderSubConceptTabComponent();
    const button = screen.getByTestId("test-createSubConceptButton");
    expect(button).toBeDisabled();
  });

  test("Create SubConcept button is enabled after selecting a concept", async () => {
    renderSubConceptTabComponent();

    const selector = screen.getByTestId("test-conceptSelector");
    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );

    fireEvent.change(selector, { target: { value: "1" } });

    await waitFor(() => {
      expect(
        screen.getByTestId("test-createSubConceptButton"),
      ).not.toBeDisabled();
    });
  });

  test("Create SubConcept button becomes disabled when selector reset to empty", async () => {
    renderSubConceptTabComponent();

    const selector = screen.getByTestId("test-conceptSelector");
    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );

    fireEvent.change(selector, { target: { value: "1" } });
    await waitFor(() => {
      expect(
        screen.getByTestId("test-createSubConceptButton"),
      ).not.toBeDisabled();
    });

    fireEvent.change(selector, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByTestId("test-createSubConceptButton")).toBeDisabled();
    });
  });

  test("clicking Create SubConcept button opens the SubConceptModal", async () => {
    renderSubConceptTabComponent();

    const selector = screen.getByTestId("test-conceptSelector");
    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );
    fireEvent.change(selector, { target: { value: "1" } });

    await waitFor(() => {
      expect(
        screen.getByTestId("test-createSubConceptButton"),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("test-createSubConceptButton"));

    expect(
      await screen.findByTestId("SubConceptModal-base"),
    ).toBeInTheDocument();
  });

  test("submits a new subconcept", async () => {
    renderSubConceptTabComponent();

    const selector = screen.getByTestId("test-conceptSelector");
    await waitFor(() =>
      expect(screen.queryByText("Variables")).toBeInTheDocument(),
    );
    fireEvent.change(selector, { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("test-createSubConceptButton"));

    fireEvent.change(
      screen.getByTestId("SubConceptModal-label").querySelector("textarea"),
      {
        target: { value: "While loops" },
      },
    );
    fireEvent.change(
      screen
        .getByTestId("SubConceptModal-description")
        .querySelector("textarea"),
      { target: { value: "Repeat while true." } },
    );
    fireEvent.change(
      screen.getByTestId("SubConceptModal-example").querySelector("textarea"),
      { target: { value: "while (ready) { run(); }" } },
    );
    fireEvent.click(screen.getByTestId("SubConceptModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      courseId: 1,
      parentConceptId: 1,
      label: "While loops",
      description: "Repeat while true.",
      example: "while (ready) { run(); }",
    });
  });

  test("clicking Edit opens the edit modal and submits an update", async () => {
    axiosMock.onPut("/api/concept/subconcept/put?conceptId=11").reply(200, {
      ...subConceptsFixtures.severalSubConcepts[0],
      label: "Updated subconcept",
      description: "Updated description",
      example: "Updated example",
    });

    renderSubConceptTabComponent();

    expect(
      await screen.findByTestId("SubConceptTable-cell-row-0-col-Edit-button"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId("SubConceptTable-cell-row-0-col-Edit-button"),
    );

    expect(await screen.findByText("Edit SubConcept")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Declaring variables")).toBeInTheDocument();

    fireEvent.change(
      screen.getByTestId("SubConceptModal-label").querySelector("textarea"),
      {
        target: { value: "Updated subconcept" },
      },
    );
    fireEvent.change(
      screen
        .getByTestId("SubConceptModal-description")
        .querySelector("textarea"),
      { target: { value: "Updated description" } },
    );
    fireEvent.change(
      screen.getByTestId("SubConceptModal-example").querySelector("textarea"),
      { target: { value: "Updated example" } },
    );
    fireEvent.click(screen.getByTestId("SubConceptModal-submit"));

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    expect(axiosMock.history.put[0].url).toBe(
      "/api/concept/subconcept/put?conceptId=11",
    );
    expect(JSON.parse(axiosMock.history.put[0].data)).toEqual({
      label: "Updated subconcept",
      description: "Updated description",
      example: "Updated example",
    });
    expect(mockToast).toHaveBeenCalledWith(
      "SubConcept Updated subconcept updated",
    );
  });

  test("clicking Delete opens a confirmation modal and deletes a subconcept", async () => {
    renderSubConceptTabComponent();

    expect(
      await screen.findByTestId("SubConceptTable-cell-row-0-col-Delete-button"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId("SubConceptTable-cell-row-0-col-Delete-button"),
    );

    expect(
      await screen.findByTestId("SubConceptDeleteModal"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this subconcept?"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete SubConcept",
      }),
    );

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].url).toBe(
      "/api/concept/delete?conceptId=11",
    );
    expect(mockToast).toHaveBeenCalledWith("SubConcept deleted");
  });
});
