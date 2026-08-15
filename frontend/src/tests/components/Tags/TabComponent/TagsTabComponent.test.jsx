import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import TagsTabComponent from "main/components/Tags/TabComponent/TagsTabComponent";
import { tagsFixtures } from "fixtures/tagsFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTab(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TagsTabComponent projectId={1} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TagsTabComponent tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);
  });

  test("sees the Add Tag button and can add one", async () => {
    axiosMock.onPost("/api/tags/post").reply(200, tagsFixtures.oneTag[0]);

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("TagsTabComponent-post-button"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("TagsTabComponent-post-button"));

    await screen.findByTestId("TagsTabComponent-TagModal-tag");
    fireEvent.change(screen.getByTestId("TagsTabComponent-TagModal-tag"), {
      target: { value: "methodology" },
    });
    fireEvent.change(
      screen.getByTestId("TagsTabComponent-TagModal-explanation"),
      { target: { value: "Describes methodology" } },
    );
    fireEvent.click(screen.getByTestId("TagsTabComponent-TagModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      tag: "methodology",
      explanation: "Describes methodology",
      color: "",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Tag successfully added."),
    );
  });

  test("shows a toast with the server message when adding fails", async () => {
    axiosMock
      .onPost("/api/tags/post")
      .reply(400, { message: "A tag named 'methodology' already exists" });

    renderTab();

    await waitFor(() => {
      expect(
        screen.getByTestId("TagsTabComponent-post-button"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("TagsTabComponent-post-button"));
    await screen.findByTestId("TagsTabComponent-TagModal-submit");
    fireEvent.change(screen.getByTestId("TagsTabComponent-TagModal-tag"), {
      target: { value: "methodology" },
    });
    fireEvent.change(
      screen.getByTestId("TagsTabComponent-TagModal-explanation"),
      { target: { value: "Describes methodology" } },
    );
    fireEvent.click(screen.getByTestId("TagsTabComponent-TagModal-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Could not add tag:\nA tag named 'methodology' already exists",
      ),
    );
  });

  test("does not show the Add Tag button when canEdit is false", async () => {
    renderTab({ canEdit: false });

    await waitFor(() => {
      expect(
        screen.getByTestId("TagsTabComponent-TagTable-cell-row-0-col-tag"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("TagsTabComponent-post-button"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(
        "TagsTabComponent-TagTable-cell-row-0-col-edit-button",
      ),
    ).not.toBeInTheDocument();
  });
});
