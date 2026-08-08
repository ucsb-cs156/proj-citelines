import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import Footer from "main/components/Nav/Footer";
import { StaffToolsContext } from "main/utils/staffToolsContext";

function renderWithStaffTools(contextOverrides = {}) {
  return render(
    <MemoryRouter>
      <StaffToolsContext.Provider
        value={{
          debugMode: false,
          enableEditing: false,
          canUseStaffTools: false,
          setStaffTool: vi.fn(),
          newConceptHandler: null,
          registerNewConceptHandler: vi.fn(),
          realignConceptsHandler: null,
          registerRealignConceptsHandler: vi.fn(),
          ...contextOverrides,
        }}
      >
        <Footer />
      </StaffToolsContext.Provider>
    </MemoryRouter>,
  );
}

describe("Footer tests", () => {
  test("renders correctly", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    const aboutLink = screen.getByRole("link", { name: "About Scaffold" });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute("href", "/about");
  });

  test("realign concepts button is hidden when editing is disabled", () => {
    renderWithStaffTools({
      canUseStaffTools: true,
      enableEditing: false,
      realignConceptsHandler: vi.fn(),
    });
    expect(
      screen.queryByTestId("realign-concepts-button"),
    ).not.toBeInTheDocument();
  });

  test("realign concepts button is hidden when no handler is registered", () => {
    renderWithStaffTools({
      canUseStaffTools: true,
      enableEditing: true,
      realignConceptsHandler: null,
    });
    expect(
      screen.queryByTestId("realign-concepts-button"),
    ).not.toBeInTheDocument();
  });

  test("realign concepts button appears between New Concept and Enable Editing when editing is enabled, and invokes the handler", () => {
    const realignConceptsHandler = vi.fn();
    const newConceptHandler = vi.fn();
    renderWithStaffTools({
      canUseStaffTools: true,
      enableEditing: true,
      newConceptHandler,
      realignConceptsHandler,
    });

    const realignButton = screen.getByTestId("realign-concepts-button");
    expect(realignButton).toHaveTextContent("Realign Concepts");

    expect(
      screen
        .getByTestId("new-concept-button")
        .compareDocumentPosition(realignButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      realignButton.compareDocumentPosition(
        screen.getByTestId("enable-editing-toggle"),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(realignButton);
    expect(realignConceptsHandler).toHaveBeenCalledTimes(1);
  });
});
