import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import TagSelector from "main/components/Tags/TagSelector";
import { tagsFixtures } from "fixtures/tagsFixtures";
import { getContrastTextColor } from "main/utils/colorUtils";
import { useBackend } from "main/utils/useBackend";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTagSelector(props, queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TagSelector {...props} />
    </QueryClientProvider>,
  );
}

// TagSelector invalidates the `/api/tags/project?projectId=` query key on a successful New Tag
// submission, but doesn't itself hold an active subscription to it (the parent page does, e.g.
// BibTexEntryShowPage's own allTags fetch) — react-query only refetches an invalidated query if
// it has an active observer, so this wrapper mounts one alongside TagSelector to make that
// refetch actually observable in a test.
function TagSelectorWithActiveTagsQuery(props) {
  const queryKey = `/api/tags/project?projectId=${props.projectId}`;
  useBackend([queryKey], { method: "GET", url: queryKey }, [], true);
  return <TagSelector {...props} />;
}

function renderTagSelectorWithActiveTagsQuery(
  props,
  queryClient = new QueryClient(),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TagSelectorWithActiveTagsQuery {...props} />
    </QueryClientProvider>,
  );
}

describe("TagSelector tests", () => {
  const allTags = tagsFixtures.threeTags;
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
  });

  test("renders without crashing with no props", async () => {
    renderTagSelector({ projectId: 1 });
    expect(screen.getByTestId("TagSelector")).toBeInTheDocument();
    expect(screen.getByTestId("TagSelector-assigned-tags")).toBeInTheDocument();
    expect(screen.getByTestId("TagSelector-no-tags")).toHaveTextContent(
      "No tags assigned",
    );
    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    expect(
      await screen.findByTestId("TagSelector-no-available-tags"),
    ).toBeInTheDocument();
  });

  test("renders assigned tags as colored pill badges with contrast text", () => {
    renderTagSelector({
      allTags,
      assignedTags: [allTags[0], allTags[1]],
      projectId: 1,
    });

    const badge0 = screen.getByTestId("TagSelector-assigned-tag-1-badge");
    expect(badge0).toHaveTextContent("methodology");
    expect(badge0).toHaveStyle(`background-color: ${allTags[0].color}`);
    expect(badge0).toHaveStyle(
      `color: ${getContrastTextColor(allTags[0].color)}`,
    );

    const badge1 = screen.getByTestId("TagSelector-assigned-tag-2-badge");
    expect(badge1).toHaveTextContent("background");
    expect(badge1).toHaveStyle(`background-color: ${allTags[1].color}`);

    expect(screen.queryByTestId("TagSelector-no-tags")).not.toBeInTheDocument();
  });

  test("uses default color when a tag has no color", () => {
    const tagWithoutColor = [{ id: 7, tag: "untitled", explanation: "none" }];
    renderTagSelector({
      allTags: tagWithoutColor,
      assignedTags: tagWithoutColor,
      projectId: 1,
    });

    const badge = screen.getByTestId("TagSelector-assigned-tag-7-badge");
    expect(badge).toHaveStyle("background-color: #6c757d");
    expect(badge).toHaveStyle("color: #ffffff");
  });

  test("shows explanation tooltip when hovering over an assigned tag", async () => {
    renderTagSelector({
      allTags,
      assignedTags: [allTags[0]],
      projectId: 1,
    });

    fireEvent.mouseOver(screen.getByTestId("TagSelector-assigned-tag-1-badge"));
    await waitFor(() => {
      expect(screen.getByText(allTags[0].explanation)).toBeInTheDocument();
    });
    const tooltip = document.getElementById(
      "TagSelector-assigned-tag-1-badge-tooltip",
    );
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(allTags[0].explanation);
  });

  test("dropdown lists only unassigned tags, with pill and explanation", async () => {
    renderTagSelector({
      allTags,
      assignedTags: [allTags[0]],
      projectId: 1,
    });

    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));

    expect(
      await screen.findByTestId("TagSelector-available-tag-2"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("TagSelector-available-tag-3"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("TagSelector-available-tag-1"),
    ).not.toBeInTheDocument();

    const badge = screen.getByTestId("TagSelector-available-tag-2-badge");
    expect(badge).toHaveTextContent("background");
    expect(badge).toHaveStyle(`background-color: ${allTags[1].color}`);
    expect(screen.getByTestId("TagSelector-available-tag-2")).toHaveTextContent(
      allTags[1].explanation,
    );
    expect(
      screen.queryByTestId("TagSelector-no-available-tags"),
    ).not.toBeInTheDocument();

    fireEvent.mouseOver(
      screen.getByTestId("TagSelector-available-tag-2-badge"),
    );
    await waitFor(() => {
      expect(
        document.getElementById("TagSelector-available-tag-2-badge-tooltip"),
      ).toBeInTheDocument();
    });
  });

  test("an assigned tag with no explanation shows no tooltip", async () => {
    const tagWithoutExplanation = { id: 9, tag: "no-desc", color: "#123456" };
    renderTagSelector({
      allTags: [tagWithoutExplanation],
      assignedTags: [tagWithoutExplanation],
      projectId: 1,
    });

    fireEvent.mouseOver(screen.getByTestId("TagSelector-assigned-tag-9-badge"));
    expect(
      document.getElementById("TagSelector-assigned-tag-9-badge-tooltip"),
    ).not.toBeInTheDocument();
  });

  test("an available tag with no explanation shows no tooltip and no muted description text in the dropdown", async () => {
    const tagWithoutExplanation = { id: 9, tag: "no-desc", color: "#123456" };
    renderTagSelector({
      allTags: [tagWithoutExplanation],
      assignedTags: [],
      projectId: 1,
    });

    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));

    const item = await screen.findByTestId("TagSelector-available-tag-9");
    expect(item).toHaveTextContent("no-desc");
    expect(item.querySelector(".text-muted")).not.toBeInTheDocument();

    fireEvent.mouseOver(
      screen.getByTestId("TagSelector-available-tag-9-badge"),
    );
    expect(
      document.getElementById("TagSelector-available-tag-9-badge-tooltip"),
    ).not.toBeInTheDocument();
  });

  test("clicking an available tag calls onAddTag with the tag", async () => {
    const onAddTag = vi.fn();
    renderTagSelector({
      allTags,
      assignedTags: [],
      onAddTag,
      projectId: 1,
    });

    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    fireEvent.click(await screen.findByTestId("TagSelector-available-tag-3"));

    expect(onAddTag).toHaveBeenCalledWith(allTags[2]);
  });

  test("clicking the remove button calls onRemoveTag with the tag", () => {
    const onRemoveTag = vi.fn();
    renderTagSelector({
      allTags,
      assignedTags: allTags,
      onRemoveTag,
      projectId: 1,
    });

    const removeButton = screen.getByTestId("TagSelector-remove-tag-2");
    expect(removeButton).toHaveAttribute("aria-label", "Remove tag background");
    fireEvent.click(removeButton);

    expect(onRemoveTag).toHaveBeenCalledWith(allTags[1]);
  });

  test("default onAddTag and onRemoveTag props do not throw", async () => {
    renderTagSelector({
      allTags,
      assignedTags: [allTags[0]],
      projectId: 1,
    });

    fireEvent.click(screen.getByTestId("TagSelector-remove-tag-1"));
    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    fireEvent.click(await screen.findByTestId("TagSelector-available-tag-2"));
  });

  test("shows 'No more tags available' when every tag is assigned", async () => {
    renderTagSelector({ allTags, assignedTags: allTags, projectId: 1 });

    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    const noneItem = await screen.findByTestId("TagSelector-no-available-tags");
    expect(noneItem).toHaveTextContent("No more tags available");
    expect(noneItem).toHaveClass("disabled");
  });

  test("hides remove buttons, add dropdown, and new tag button when canEdit is false", () => {
    renderTagSelector({
      allTags,
      assignedTags: [allTags[0]],
      projectId: 1,
      canEdit: false,
    });

    expect(
      screen.getByTestId("TagSelector-assigned-tag-1-badge"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("TagSelector-remove-tag-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("TagSelector-add-tag-dropdown"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("TagSelector-new-tag-button"),
    ).not.toBeInTheDocument();
  });

  test("manage tags link points to the project page's Tags tab and opens in a new tab", () => {
    renderTagSelector({ allTags, assignedTags: [], projectId: 17 });

    const link = screen.getByTestId("TagSelector-manage-tags-link");
    expect(link).toHaveTextContent("Manage Tags");
    expect(link).toHaveAttribute("href", "/project/17?tab=Tags");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("supports a custom testId", () => {
    renderTagSelector({
      allTags,
      assignedTags: [allTags[0]],
      projectId: 1,
      testId: "MyTagSelector",
    });

    expect(screen.getByTestId("MyTagSelector")).toBeInTheDocument();
    expect(
      screen.getByTestId("MyTagSelector-assigned-tag-1-badge"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("MyTagSelector-add-tag-dropdown"),
    ).toBeInTheDocument();
  });

  test("clicking New Tag opens the create-tag modal", () => {
    renderTagSelector({ allTags, assignedTags: [], projectId: 1 });

    expect(
      screen.queryByTestId("TagSelector-TagModal-base"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("TagSelector-new-tag-button"));

    expect(screen.getByTestId("TagSelector-TagModal-base")).toBeInTheDocument();
    expect(screen.getByText("Create Tag")).toBeInTheDocument();
  });

  test("submitting the New Tag modal POSTs the new tag, toasts, closes the modal, and refreshes the tag list", async () => {
    axiosMock
      .onPost("/api/tags/post")
      .reply(200, { id: 4, tag: "new-tag", explanation: "desc", color: "" });
    axiosMock
      .onGet("/api/tags/project?projectId=1")
      .reply(200, tagsFixtures.threeTags);

    // Uses the active-subscriber wrapper (not renderTagSelector) so the invalidated
    // /api/tags/project query has an active observer and actually issues a refetch GET.
    renderTagSelectorWithActiveTagsQuery({
      allTags,
      assignedTags: [],
      projectId: 1,
    });

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

    fireEvent.click(screen.getByTestId("TagSelector-new-tag-button"));
    fireEvent.change(screen.getByTestId("TagSelector-TagModal-tag"), {
      target: { value: "new-tag" },
    });
    fireEvent.change(screen.getByTestId("TagSelector-TagModal-explanation"), {
      target: { value: "desc" },
    });
    fireEvent.click(screen.getByTestId("TagSelector-TagModal-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].url).toBe("/api/tags/post");
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      tag: "new-tag",
      explanation: "desc",
      color: "",
    });

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Tag successfully added."),
    );
    await waitFor(() => {
      expect(
        screen.queryByTestId("TagSelector-TagModal-base"),
      ).not.toBeInTheDocument();
    });
    // The success invalidates the shared /api/tags/project?projectId=1 query key, and since
    // the wrapper above keeps it actively subscribed, that triggers a second (refetch) GET.
    await waitFor(() => expect(axiosMock.history.get.length).toBe(2));
    expect(axiosMock.history.get[1].url).toBe("/api/tags/project?projectId=1");
  });

  test("a network error (no response) on New Tag submission falls back to the raw error message", async () => {
    axiosMock.onPost("/api/tags/post").networkError();

    renderTagSelector({ allTags, assignedTags: [], projectId: 1 });

    fireEvent.click(screen.getByTestId("TagSelector-new-tag-button"));
    fireEvent.change(screen.getByTestId("TagSelector-TagModal-tag"), {
      target: { value: "new-tag" },
    });
    fireEvent.change(screen.getByTestId("TagSelector-TagModal-explanation"), {
      target: { value: "desc" },
    });
    fireEvent.click(screen.getByTestId("TagSelector-TagModal-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Could not add tag:\nNetwork Error",
      ),
    );
    expect(screen.getByTestId("TagSelector-TagModal-base")).toBeInTheDocument();
  });

  test("a failed New Tag submission toasts the backend error message and leaves the modal open", async () => {
    axiosMock
      .onPost("/api/tags/post")
      .reply(400, { message: 'A tag named "new-tag" already exists.' });

    renderTagSelector({ allTags, assignedTags: [], projectId: 1 });

    fireEvent.click(screen.getByTestId("TagSelector-new-tag-button"));
    fireEvent.change(screen.getByTestId("TagSelector-TagModal-tag"), {
      target: { value: "new-tag" },
    });
    fireEvent.change(screen.getByTestId("TagSelector-TagModal-explanation"), {
      target: { value: "desc" },
    });
    fireEvent.click(screen.getByTestId("TagSelector-TagModal-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        'Could not add tag:\nA tag named "new-tag" already exists.',
      ),
    );
    expect(screen.getByTestId("TagSelector-TagModal-base")).toBeInTheDocument();
  });
});
