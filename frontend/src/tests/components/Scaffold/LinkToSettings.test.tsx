import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import LinkToSettings from "main/components/Scaffold/LinkToSettings";

const course = { id: 7, courseName: "CMPSC 156" };

describe("LinkToSettings", () => {
  test("links to the course settings page with the default testId", () => {
    render(
      <MemoryRouter>
        <LinkToSettings course={course} />
      </MemoryRouter>,
    );
    const link = screen.getByTestId("LinkToSettings");
    expect(link).toHaveAttribute("href", "/course/7/settings");
  });

  test("honors the testId prop", () => {
    render(
      <MemoryRouter>
        <LinkToSettings course={course} testId="custom-id" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("custom-id")).toHaveAttribute(
      "href",
      "/course/7/settings",
    );
  });

  test("omits the rowIndex suffix from ids when rowIndex is not given", async () => {
    render(
      <MemoryRouter>
        <LinkToSettings course={course} />
      </MemoryRouter>,
    );
    fireEvent.mouseOver(screen.getByTestId("LinkToSettings"));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveAttribute("id", "LinkToSettings-tooltip-coursename");
    expect(tooltip).toHaveTextContent(
      "Settings and Course Roster for CMPSC 156",
    );
  });

  test("suffixes the testId and tooltip id with rowIndex when given", async () => {
    render(
      <MemoryRouter>
        <LinkToSettings course={course} rowIndex={3} />
      </MemoryRouter>,
    );
    const link = screen.getByTestId("LinkToSettings-3");
    expect(link).toHaveAttribute("href", "/course/7/settings");
    fireEvent.mouseOver(link);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveAttribute(
      "id",
      "LinkToSettings-tooltip-coursename-3",
    );
  });
});
