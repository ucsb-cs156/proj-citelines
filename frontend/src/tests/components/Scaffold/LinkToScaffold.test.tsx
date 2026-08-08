import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import LinkToScaffold from "main/components/Scaffold/LinkToScaffold";

const course = { id: 7, courseName: "CMPSC 156" };

describe("LinkToScaffold", () => {
  test("links to the course scaffold page and shows the course name", () => {
    render(
      <MemoryRouter>
        <LinkToScaffold course={course} />
      </MemoryRouter>,
    );
    const link = screen.getByTestId("LinkToScaffold");
    expect(link).toHaveAttribute("href", "/course/7");
    expect(link).toHaveTextContent("CMPSC 156");
  });

  test("honors the testId prop", () => {
    render(
      <MemoryRouter>
        <LinkToScaffold course={course} testId="custom-id" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("custom-id")).toHaveAttribute(
      "href",
      "/course/7",
    );
  });

  test("omits the rowIndex suffix from ids when rowIndex is not given", async () => {
    render(
      <MemoryRouter>
        <LinkToScaffold course={course} />
      </MemoryRouter>,
    );
    fireEvent.mouseOver(screen.getByTestId("LinkToScaffold"));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveAttribute("id", "LinkToScaffold-tooltip-coursename");
    expect(tooltip).toHaveTextContent("View scaffold for CMPSC 156");
  });

  test("suffixes the testId and tooltip id with rowIndex when given", async () => {
    render(
      <MemoryRouter>
        <LinkToScaffold course={course} rowIndex={3} />
      </MemoryRouter>,
    );
    const link = screen.getByTestId("LinkToScaffold-3");
    expect(link).toHaveAttribute("href", "/course/7");
    fireEvent.mouseOver(link);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveAttribute(
      "id",
      "LinkToScaffold-tooltip-coursename-3",
    );
  });
});
