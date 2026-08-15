import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import TagSelector from "main/components/Tags/TagSelector";
import { tagsFixtures } from "fixtures/tagsFixtures";
import { getContrastTextColor } from "main/utils/colorUtils";

describe("TagSelector tests", () => {
  const allTags = tagsFixtures.threeTags;

  test("renders without crashing with no props", () => {
    render(<TagSelector projectId={1} />);
    expect(screen.getByTestId("TagSelector")).toBeInTheDocument();
    expect(screen.getByTestId("TagSelector-no-tags")).toHaveTextContent(
      "No tags assigned",
    );
  });

  test("renders assigned tags as colored pill badges with contrast text", () => {
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[allTags[0], allTags[1]]}
        projectId={1}
      />,
    );

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
    render(
      <TagSelector
        allTags={tagWithoutColor}
        assignedTags={tagWithoutColor}
        projectId={1}
      />,
    );

    const badge = screen.getByTestId("TagSelector-assigned-tag-7-badge");
    expect(badge).toHaveStyle("background-color: #6c757d");
    expect(badge).toHaveStyle("color: #ffffff");
  });

  test("shows explanation tooltip when hovering over an assigned tag", async () => {
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[allTags[0]]}
        projectId={1}
      />,
    );

    fireEvent.mouseOver(screen.getByTestId("TagSelector-assigned-tag-1"));
    await waitFor(() => {
      expect(screen.getByText(allTags[0].explanation)).toBeInTheDocument();
    });
  });

  test("dropdown lists only unassigned tags, with pill and explanation", async () => {
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[allTags[0]]}
        projectId={1}
      />,
    );

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
  });

  test("clicking an available tag calls onAddTag with the tag", async () => {
    const onAddTag = vi.fn();
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[]}
        onAddTag={onAddTag}
        projectId={1}
      />,
    );

    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    fireEvent.click(await screen.findByTestId("TagSelector-available-tag-3"));

    expect(onAddTag).toHaveBeenCalledWith(allTags[2]);
  });

  test("clicking the remove button calls onRemoveTag with the tag", () => {
    const onRemoveTag = vi.fn();
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={allTags}
        onRemoveTag={onRemoveTag}
        projectId={1}
      />,
    );

    const removeButton = screen.getByTestId("TagSelector-remove-tag-2");
    expect(removeButton).toHaveAttribute("aria-label", "Remove tag background");
    fireEvent.click(removeButton);

    expect(onRemoveTag).toHaveBeenCalledWith(allTags[1]);
  });

  test("default onAddTag and onRemoveTag props do not throw", async () => {
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[allTags[0]]}
        projectId={1}
      />,
    );

    fireEvent.click(screen.getByTestId("TagSelector-remove-tag-1"));
    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    fireEvent.click(await screen.findByTestId("TagSelector-available-tag-2"));
  });

  test("shows 'No more tags available' when every tag is assigned", async () => {
    render(
      <TagSelector allTags={allTags} assignedTags={allTags} projectId={1} />,
    );

    fireEvent.click(screen.getByTestId("TagSelector-add-tag-dropdown"));
    const noneItem = await screen.findByTestId("TagSelector-no-available-tags");
    expect(noneItem).toHaveTextContent("No more tags available");
    expect(noneItem).toHaveClass("disabled");
  });

  test("hides remove buttons and add dropdown when canEdit is false", () => {
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[allTags[0]]}
        projectId={1}
        canEdit={false}
      />,
    );

    expect(
      screen.getByTestId("TagSelector-assigned-tag-1-badge"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("TagSelector-remove-tag-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("TagSelector-add-tag-dropdown"),
    ).not.toBeInTheDocument();
  });

  test("manage tags link points to the project page and opens in a new tab", () => {
    render(<TagSelector allTags={allTags} assignedTags={[]} projectId={17} />);

    const link = screen.getByTestId("TagSelector-manage-tags-link");
    expect(link).toHaveTextContent("Manage Tags");
    expect(link).toHaveAttribute("href", "/project/17");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("supports a custom testId", () => {
    render(
      <TagSelector
        allTags={allTags}
        assignedTags={[allTags[0]]}
        projectId={1}
        testId="MyTagSelector"
      />,
    );

    expect(screen.getByTestId("MyTagSelector")).toBeInTheDocument();
    expect(
      screen.getByTestId("MyTagSelector-assigned-tag-1-badge"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("MyTagSelector-add-tag-dropdown"),
    ).toBeInTheDocument();
  });
});
