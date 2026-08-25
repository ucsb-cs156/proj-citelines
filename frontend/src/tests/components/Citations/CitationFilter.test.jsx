import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import CitationFilter from "main/components/Citations/CitationFilter";
import {
  DEFAULT_CITATION_FILTER,
  CITATION_FILTER_LINK_OPTIONS,
  CITATION_FILTER_DUPLICATE_OPTIONS,
} from "main/utils/citationFilter";
import { tagsFixtures } from "fixtures/tagsFixtures";

describe("CitationFilter tests", () => {
  test("renders closed by default, showing lowercase 'citation filters' and a ▼ toggle icon", () => {
    render(<CitationFilter />);

    expect(screen.getByTestId("CitationFilter-header")).toHaveTextContent(
      "citation filters",
    );
    expect(screen.getByTestId("CitationFilter-toggle-icon")).toHaveTextContent(
      "▼",
    );
    // Collapse keeps its children mounted even while closed (see CollapsibleCard's doc comment
    // elsewhere in this codebase for the same behavior/rationale) — the body is present regardless.
    expect(screen.getByTestId("CitationFilter-body")).toBeInTheDocument();
  });

  test("renders expanded when the expanded prop is true, showing 'Citation Filters' and a ▲ toggle icon", () => {
    render(<CitationFilter expanded={true} />);

    expect(screen.getByTestId("CitationFilter-header")).toHaveTextContent(
      "Citation Filters",
    );
    expect(screen.getByTestId("CitationFilter-toggle-icon")).toHaveTextContent(
      "▲",
    );
  });

  test("clicking the header while closed calls onExpandedChange(true)", () => {
    const onExpandedChange = vi.fn();
    render(
      <CitationFilter expanded={false} onExpandedChange={onExpandedChange} />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-header"));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  test("clicking the header while expanded calls onExpandedChange(false)", () => {
    const onExpandedChange = vi.fn();
    render(
      <CitationFilter expanded={true} onExpandedChange={onExpandedChange} />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-header"));

    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  test("clicking a relevance button toggles it on and off via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationFilter filter={DEFAULT_CITATION_FILTER} onChange={onChange} />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-relevance-High"));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CITATION_FILTER,
      relevance: ["Medium", "Low", "None", "Unreviewed"],
    });
  });

  test("a selected relevance button is styled 'primary'; an unselected one is 'outline-primary'", () => {
    const filter = { ...DEFAULT_CITATION_FILTER, relevance: ["Medium"] };
    render(<CitationFilter filter={filter} />);

    expect(screen.getByTestId("CitationFilter-relevance-Medium")).toHaveClass(
      "btn-primary",
    );
    expect(screen.getByTestId("CitationFilter-relevance-High")).toHaveClass(
      "btn-outline-primary",
    );
  });

  test("re-selecting a deselected relevance option adds it back", () => {
    const onChange = vi.fn();
    const filter = { ...DEFAULT_CITATION_FILTER, relevance: ["Medium"] };
    render(<CitationFilter filter={filter} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("CitationFilter-relevance-High"));

    expect(onChange).toHaveBeenCalledWith({
      ...filter,
      relevance: ["Medium", "High"],
    });
  });

  test("selecting a link radio option calls onChange with the new link value", () => {
    const onChange = vi.fn();
    render(
      <CitationFilter filter={DEFAULT_CITATION_FILTER} onChange={onChange} />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-link-doi"));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CITATION_FILTER,
      link: "doi",
    });
  });

  test("each Links radio has the correct name/id and reflects the current filter value", () => {
    const filter = { ...DEFAULT_CITATION_FILTER, link: "doi" };
    render(<CitationFilter filter={filter} />);

    CITATION_FILTER_LINK_OPTIONS.forEach((option) => {
      const radio = screen.getByTestId(`CitationFilter-link-${option}`);
      expect(radio).toHaveAttribute("name", "CitationFilter-link");
      expect(radio).toHaveAttribute("id", `CitationFilter-link-${option}`);
      if (option === "doi") expect(radio).toBeChecked();
      else expect(radio).not.toBeChecked();
    });
  });

  test("each Duplicates radio has the correct name/id and reflects the current filter value", () => {
    const filter = { ...DEFAULT_CITATION_FILTER, duplicates: "dup" };
    render(<CitationFilter filter={filter} />);

    CITATION_FILTER_DUPLICATE_OPTIONS.forEach((option) => {
      const radio = screen.getByTestId(`CitationFilter-duplicates-${option}`);
      expect(radio).toHaveAttribute("name", "CitationFilter-duplicates");
      expect(radio).toHaveAttribute(
        "id",
        `CitationFilter-duplicates-${option}`,
      );
      if (option === "dup") expect(radio).toBeChecked();
      else expect(radio).not.toBeChecked();
    });
  });

  test("the search field's label is correctly associated with the input", () => {
    render(<CitationFilter />);

    expect(screen.getByLabelText("Search (author/title)")).toBe(
      screen.getByTestId("CitationFilter-search"),
    );
  });

  test("each tagMode radio has the correct name/id and reflects the current filter value, and 'or' can be re-selected", () => {
    const onChange = vi.fn();
    const filter = { ...DEFAULT_CITATION_FILTER, tagMode: "and" };
    render(<CitationFilter filter={filter} onChange={onChange} />);

    const andRadio = screen.getByTestId("CitationFilter-tagMode-and");
    const orRadio = screen.getByTestId("CitationFilter-tagMode-or");
    expect(andRadio).toHaveAttribute("name", "CitationFilter-tagMode");
    expect(orRadio).toHaveAttribute("name", "CitationFilter-tagMode");
    expect(andRadio).toHaveAttribute("id", "CitationFilter-tagMode-and");
    expect(orRadio).toHaveAttribute("id", "CitationFilter-tagMode-or");
    expect(andRadio).toBeChecked();
    expect(orRadio).not.toBeChecked();

    fireEvent.click(orRadio);

    expect(onChange).toHaveBeenCalledWith({ ...filter, tagMode: "or" });
  });

  test("selecting a duplicates radio option calls onChange with the new duplicates value", () => {
    const onChange = vi.fn();
    render(
      <CitationFilter filter={DEFAULT_CITATION_FILTER} onChange={onChange} />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-duplicates-dup"));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CITATION_FILTER,
      duplicates: "dup",
    });
  });

  test("typing in the search field calls onChange with the new search text", () => {
    const onChange = vi.fn();
    render(
      <CitationFilter filter={DEFAULT_CITATION_FILTER} onChange={onChange} />,
    );

    fireEvent.change(screen.getByTestId("CitationFilter-search"), {
      target: { value: "smith" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CITATION_FILTER,
      search: "smith",
    });
  });

  test("selecting the tag 'and'/'or' mode calls onChange with the new tagMode", () => {
    const onChange = vi.fn();
    render(
      <CitationFilter filter={DEFAULT_CITATION_FILTER} onChange={onChange} />,
    );

    expect(screen.getByTestId("CitationFilter-tagMode-and")).toBeChecked();

    fireEvent.click(screen.getByTestId("CitationFilter-tagMode-or"));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CITATION_FILTER,
      tagMode: "or",
    });
  });

  test("shows 'No tags selected' when no tags are in the filter", () => {
    render(<CitationFilter allTags={tagsFixtures.threeTags} />);

    expect(screen.getByTestId("CitationFilter-no-tags")).toHaveTextContent(
      "No tags selected",
    );
  });

  test("defaults allTags to an empty list, so the Add Tag dropdown has nothing to offer", () => {
    render(<CitationFilter />);

    fireEvent.click(screen.getByTestId("CitationFilter-add-tag-dropdown"));

    expect(
      screen.getByTestId("CitationFilter-no-available-tags"),
    ).toBeInTheDocument();
  });

  test("shows a pill for each selected tag, and only unselected tags in the Add Tag dropdown", () => {
    const filter = { ...DEFAULT_CITATION_FILTER, tagIds: [1] };
    render(<CitationFilter filter={filter} allTags={tagsFixtures.threeTags} />);

    expect(screen.getByTestId("CitationFilter-selected-tags")).toContainElement(
      screen.getByTestId("CitationFilter-selected-tag-1"),
    );
    expect(
      screen.getByTestId("CitationFilter-selected-tag-1-badge"),
    ).toHaveTextContent("methodology");
    expect(screen.getByTestId("CitationFilter-remove-tag-1")).toHaveAttribute(
      "aria-label",
      "Remove tag methodology",
    );
    expect(
      screen.queryByTestId("CitationFilter-no-tags"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("CitationFilter-add-tag-dropdown"));

    expect(
      screen.getByTestId("CitationFilter-available-tag-2-badge"),
    ).toHaveTextContent("background");
    expect(
      screen.getByTestId("CitationFilter-available-tag-3"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationFilter-available-tag-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationFilter-no-available-tags"),
    ).not.toBeInTheDocument();
  });

  test("shows 'No more tags available' when every tag is already selected", () => {
    const filter = {
      ...DEFAULT_CITATION_FILTER,
      tagIds: tagsFixtures.threeTags.map((t) => t.id),
    };
    render(<CitationFilter filter={filter} allTags={tagsFixtures.threeTags} />);

    fireEvent.click(screen.getByTestId("CitationFilter-add-tag-dropdown"));

    expect(
      screen.getByTestId("CitationFilter-no-available-tags"),
    ).toHaveTextContent("No more tags available");
  });

  test("clicking an available tag in the dropdown adds it to tagIds via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationFilter
        filter={DEFAULT_CITATION_FILTER}
        onChange={onChange}
        allTags={tagsFixtures.threeTags}
      />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-add-tag-dropdown"));
    fireEvent.click(screen.getByTestId("CitationFilter-available-tag-2"));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CITATION_FILTER,
      tagIds: [2],
    });
  });

  test("clicking the remove button on a selected tag removes it from tagIds via onChange", () => {
    const onChange = vi.fn();
    const filter = { ...DEFAULT_CITATION_FILTER, tagIds: [1, 2] };
    render(
      <CitationFilter
        filter={filter}
        onChange={onChange}
        allTags={tagsFixtures.threeTags}
      />,
    );

    fireEvent.click(screen.getByTestId("CitationFilter-remove-tag-1"));

    expect(onChange).toHaveBeenCalledWith({ ...filter, tagIds: [2] });
  });

  test("supports a custom testId", () => {
    render(<CitationFilter testId="MyFilter" />);

    expect(screen.getByTestId("MyFilter")).toBeInTheDocument();
    expect(screen.getByTestId("MyFilter-header")).toBeInTheDocument();
    expect(screen.getByTestId("MyFilter-relevance-High")).toBeInTheDocument();
  });
});
