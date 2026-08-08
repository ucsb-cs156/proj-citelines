import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConceptTabComponent from "main/components/Courses/TabComponent/ConceptTabComponent";
import conceptsFixtures from "fixtures/conceptsFixtures";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  test,
  vi,
} from "vitest";

vi.mock("react-simplemde-editor", () => ({
  default: ({ value = "", onChange }) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const mockToast = vi.fn();

vi.mock("react-toastify", async (importOriginal) => {
  const originalModule = await importOriginal();
  const toast = (x) => mockToast(x);
  return {
    ...originalModule,
    toast,
  };
});

const postSpy = vi.fn();
const putSpy = vi.fn();
const deleteSpy = vi.fn();

const server = setupServer(
  http.get("/api/concepts/course", () =>
    HttpResponse.json(conceptsFixtures.severalConcepts),
  ),
  http.post("/api/concept", async ({ request }) => {
    const body = await request.json();
    postSpy(body);
    return HttpResponse.json({ id: 99, ...body });
  }),
  http.put("/api/concept/put", async ({ request }) => {
    const conceptId = new URL(request.url).searchParams.get("conceptId");
    const body = await request.json();
    putSpy({ conceptId, body });
    return HttpResponse.json({ id: Number(conceptId), ...body });
  }),
  http.delete("/api/concept/delete", ({ request }) => {
    const conceptId = new URL(request.url).searchParams.get("conceptId");
    deleteSpy(conceptId);
    return HttpResponse.json({
      message: `Concept with id ${conceptId} deleted`,
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockToast.mockClear();
  postSpy.mockClear();
  putSpy.mockClear();
  deleteSpy.mockClear();
});
afterAll(() => server.close());

describe("ConceptTabComponent tests", () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderComponent = (props = {}) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ConceptTabComponent courseId={7} testIdPrefix="test" {...props} />
      </QueryClientProvider>,
    );

  test("renders fetched concepts and correct data-testid", async () => {
    renderComponent();

    expect(screen.getByText("Concepts")).toBeInTheDocument();
    expect(screen.getByTestId("test-conceptTab")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId("test-ConceptTable-cell-row-0-col-label"),
      ).toHaveTextContent("Variables");
    });

    expect(
      screen.getByTestId("test-ConceptTable-cell-row-0-col-Edit-button"),
    ).toBeInTheDocument();
  });

  test("submits a new concept using the current course id", async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId("test-post-button"));

    fireEvent.change(
      screen.getByTestId("ConceptModal-label").querySelector("textarea"),
      {
        target: { value: "Recursion" },
      },
    );
    fireEvent.change(
      screen.getByTestId("ConceptModal-description").querySelector("textarea"),
      {
        target: { value: "Functions that call themselves." },
      },
    );
    fireEvent.change(
      screen.getByTestId("ConceptModal-example").querySelector("textarea"),
      {
        target: { value: "factorial(n - 1)" },
      },
    );
    fireEvent.click(screen.getByTestId("ConceptModal-submit"));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith({
        courseId: 7,
        label: "Recursion",
        description: "Functions that call themselves.",
        example: "factorial(n - 1)",
        x: 0,
        y: 0,
      });
    });

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Concept Recursion created"),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("ConceptModal-submit"),
      ).not.toBeInTheDocument(),
    );
  });

  test("edits an existing concept", async () => {
    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByTestId("test-ConceptTable-cell-row-0-col-Edit-button"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByTestId("test-ConceptTable-cell-row-0-col-Edit-button"),
    );

    expect(await screen.findByText("Edit Concept")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Variables")).toBeInTheDocument();

    fireEvent.change(
      screen.getByTestId("ConceptModal-label").querySelector("textarea"),
      {
        target: { value: "Updated Variables" },
      },
    );
    fireEvent.change(
      screen.getByTestId("ConceptModal-description").querySelector("textarea"),
      {
        target: { value: "Updated description" },
      },
    );
    fireEvent.change(
      screen.getByTestId("ConceptModal-example").querySelector("textarea"),
      {
        target: { value: "let answer = 42;" },
      },
    );
    fireEvent.click(screen.getByTestId("ConceptModal-submit"));

    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith({
        conceptId: "1",
        body: {
          label: "Updated Variables",
          description: "Updated description",
          example: "let answer = 42;",
        },
      }),
    );
    expect(mockToast).toHaveBeenCalledWith("Concept Updated Variables updated");
  });

  test("deletes an existing concept after confirmation", async () => {
    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByTestId("test-ConceptTable-cell-row-0-col-Delete-button"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByTestId("test-ConceptTable-cell-row-0-col-Delete-button"),
    );

    expect(await screen.findByTestId("ConceptDeleteModal")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Are you sure you want to delete this concept? Deleting a top-level concept also deletes all of its subconcepts.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete Concept",
      }),
    );

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("1"));
    expect(mockToast).toHaveBeenCalledWith("Concept deleted");
  });

  test("renders with custom testIdPrefix", async () => {
    renderComponent({ testIdPrefix: "InstructorCourseShowPage" });

    expect(
      screen.getByTestId("InstructorCourseShowPage-conceptTab"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "InstructorCourseShowPage-ConceptTable-cell-row-0-col-id",
        ),
      ).toBeInTheDocument();
    });
  });
});
