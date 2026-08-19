import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TagPill from "main/components/Tags/TagPill";

describe("TagPill tests", () => {
  test("renders the tag name as a pill badge in the assigned color", () => {
    render(
      <TagPill
        tag={{ id: 1, tag: "methodology", color: "#1e88e5" }}
        testId="TagPill-1"
      />,
    );

    const badge = screen.getByTestId("TagPill-1");
    expect(badge).toHaveTextContent("methodology");
    expect(badge).toHaveStyle("background-color: #1e88e5");
  });

  test("uses the default gray color when the tag has no color", () => {
    render(<TagPill tag={{ id: 1, tag: "untitled" }} testId="TagPill-1" />);

    expect(screen.getByTestId("TagPill-1")).toHaveStyle(
      "background-color: #6c757d",
    );
  });

  test("shows a tooltip with the explanation on hover, when an explanation is present", async () => {
    render(
      <TagPill
        tag={{ id: 1, tag: "methodology", explanation: "Uses methodology" }}
        testId="TagPill-1"
      />,
    );

    fireEvent.mouseOver(screen.getByTestId("TagPill-1"));

    await waitFor(() => {
      expect(document.getElementById("TagPill-1-tooltip")).toBeInTheDocument();
    });
    expect(document.getElementById("TagPill-1-tooltip")).toHaveTextContent(
      "Uses methodology",
    );
  });

  test("shows no tooltip when the tag has no explanation", async () => {
    render(<TagPill tag={{ id: 1, tag: "methodology" }} testId="TagPill-1" />);

    fireEvent.mouseOver(screen.getByTestId("TagPill-1"));

    // No OverlayTrigger is rendered at all in this case, so there's nothing to wait for; assert
    // synchronously that no tooltip element ever appears.
    expect(
      document.getElementById("TagPill-1-tooltip"),
    ).not.toBeInTheDocument();
  });

  test("shows no tooltip when the explanation is an empty string", async () => {
    render(
      <TagPill
        tag={{ id: 1, tag: "methodology", explanation: "" }}
        testId="TagPill-1"
      />,
    );

    fireEvent.mouseOver(screen.getByTestId("TagPill-1"));

    expect(
      document.getElementById("TagPill-1-tooltip"),
    ).not.toBeInTheDocument();
  });
});
