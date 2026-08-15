import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import TagTable from "main/components/Tags/TagTable";
import { tagsFixtures } from "fixtures/tagsFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTable(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TagTable {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TagTable tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders without crashing for empty table", () => {
    renderTable({ tags: [], projectId: 1 });
  });

  test("renders expected columns, and hides edit/delete when canEdit is false", () => {
    renderTable({ tags: tagsFixtures.threeTags, projectId: 1, canEdit: false });

    ["Tag", "Explanation"].forEach((h) =>
      expect(screen.getByText(h)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  test("renders tags as colored pill badges", () => {
    renderTable({ tags: tagsFixtures.threeTags, projectId: 1, testId: "TT" });

    const badge = screen.getByTestId("TT-cell-row-0-col-tag-badge");
    expect(badge).toHaveTextContent("methodology");
    expect(badge).toHaveStyle(
      `background-color: ${tagsFixtures.threeTags[0].color}`,
    );
    // Ensure no Bootstrap `bg-*` class is applied, since Bootstrap's
    // background utility classes use `!important` and would override the
    // inline style color set above.
    expect(badge.className).not.toMatch(/\bbg-\S+/);
  });

  test("shows edit/delete buttons when canEdit is true", () => {
    renderTable({
      tags: tagsFixtures.threeTags,
      projectId: 1,
      canEdit: true,
      testId: "TT",
    });

    expect(
      screen.getByTestId("TT-cell-row-0-col-edit-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("TT-cell-row-0-col-delete-button"),
    ).toBeInTheDocument();
  });

  test("can edit a tag via the modal", async () => {
    axiosMock.onPut("/api/tags").reply(200, {
      ...tagsFixtures.oneTag[0],
      tag: "new-tag",
      explanation: "New explanation",
    });

    renderTable({
      tags: tagsFixtures.threeTags,
      projectId: 1,
      canEdit: true,
      testId: "TT",
    });

    fireEvent.click(screen.getByTestId("TT-cell-row-0-col-edit-button"));

    await screen.findByTestId("TT-TagModal-tag");
    fireEvent.change(screen.getByTestId("TT-TagModal-tag"), {
      target: { value: "new-tag" },
    });
    fireEvent.change(screen.getByTestId("TT-TagModal-explanation"), {
      target: { value: "New explanation" },
    });
    fireEvent.click(screen.getByTestId("TT-TagModal-submit"));

    await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
    expect(axiosMock.history.put[0].params).toEqual({
      id: 1,
      projectId: 1,
      tag: "new-tag",
      explanation: "New explanation",
      color: tagsFixtures.threeTags[0].color,
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Tag updated successfully"),
    );
  });

  test("can delete a tag after confirming", async () => {
    axiosMock.onDelete("/api/tags/delete").reply(200, {});

    renderTable({
      tags: tagsFixtures.threeTags,
      projectId: 1,
      canEdit: true,
      testId: "TT",
    });

    fireEvent.click(screen.getByTestId("TT-cell-row-0-col-delete-button"));

    await screen.findByText(/Please confirm/);
    fireEvent.click(screen.getByTestId("TT-delete-modal-confirm-button"));

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].params).toEqual({
      id: 1,
      projectId: 1,
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Tag deleted successfully"),
    );
  });

  test("Do not delete button hides the modal without deleting", async () => {
    renderTable({
      tags: tagsFixtures.threeTags,
      projectId: 1,
      canEdit: true,
      testId: "TT",
    });

    fireEvent.click(screen.getByTestId("TT-cell-row-0-col-delete-button"));
    await screen.findByText(/Please confirm/);
    fireEvent.click(screen.getByText("Do not delete"));

    await waitFor(() => {
      expect(screen.queryByText(/Please confirm/)).not.toBeInTheDocument();
    });
    expect(axiosMock.history.delete.length).toBe(0);
  });

  test("shows a toast with the server message when edit fails", async () => {
    axiosMock
      .onPut("/api/tags")
      .reply(400, { message: "A tag named 'new-tag' already exists" });

    renderTable({
      tags: tagsFixtures.threeTags,
      projectId: 1,
      canEdit: true,
      testId: "TT",
    });

    fireEvent.click(screen.getByTestId("TT-cell-row-0-col-edit-button"));
    await screen.findByTestId("TT-TagModal-submit");
    fireEvent.click(screen.getByTestId("TT-TagModal-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Could not update tag:\nA tag named 'new-tag' already exists",
      ),
    );
  });
});
