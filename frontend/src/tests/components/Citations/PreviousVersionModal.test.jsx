import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import PreviousVersionModal from "main/components/Citations/PreviousVersionModal";

describe("PreviousVersionModal tests", () => {
  test("renders nothing visible when show is false", () => {
    render(
      <PreviousVersionModal
        show={false}
        onHide={vi.fn()}
        publishedMarkdown="# Hello"
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("PreviousVersionModal-source"),
    ).not.toBeInTheDocument();
  });

  test("shows the markdown source and its rendered form side by side", () => {
    render(
      <PreviousVersionModal
        show={true}
        onHide={vi.fn()}
        publishedMarkdown="# Hello *world*"
        onRestore={vi.fn()}
      />,
    );

    expect(screen.getByTestId("PreviousVersionModal-source")).toHaveTextContent(
      "# Hello *world*",
    );
    expect(
      screen.getByRole("heading", { name: "Hello world" }),
    ).toBeInTheDocument();
  });

  test("Return to Editor calls onHide", () => {
    const onHide = vi.fn();
    render(
      <PreviousVersionModal
        show={true}
        onHide={onHide}
        publishedMarkdown="text"
        onRestore={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("PreviousVersionModal-return-button"));

    expect(onHide).toHaveBeenCalled();
  });

  test("Restore this Version calls onRestore", () => {
    const onRestore = vi.fn();
    render(
      <PreviousVersionModal
        show={true}
        onHide={vi.fn()}
        publishedMarkdown="text"
        onRestore={onRestore}
      />,
    );

    fireEvent.click(screen.getByTestId("PreviousVersionModal-restore-button"));

    expect(onRestore).toHaveBeenCalled();
  });

  test("the Restore this Version button is disabled while isRestoring is true", () => {
    render(
      <PreviousVersionModal
        show={true}
        onHide={vi.fn()}
        publishedMarkdown="text"
        onRestore={vi.fn()}
        isRestoring={true}
      />,
    );

    expect(
      screen.getByTestId("PreviousVersionModal-restore-button"),
    ).toBeDisabled();
  });

  test("uses a custom testId when provided", () => {
    render(
      <PreviousVersionModal
        show={true}
        onHide={vi.fn()}
        publishedMarkdown="text"
        onRestore={vi.fn()}
        testId="CustomModal"
      />,
    );

    expect(screen.getByTestId("CustomModal-base")).toBeInTheDocument();
  });
});
