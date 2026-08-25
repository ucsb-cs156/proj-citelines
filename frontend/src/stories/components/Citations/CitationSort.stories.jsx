import React, { useState } from "react";
import CitationSort from "main/components/Citations/CitationSort";
import { DEFAULT_CITATION_SORT } from "main/utils/citationSort";

export default {
  title: "components/Citations/CitationSort",
  component: CitationSort,
};

// CitationSort is a controlled component (value/onChange, like CitationFilter/ColorChooser; the
// open/closed state is controlled the same way, issue #126) — this Template wraps both in local
// state so the story is actually interactive (drag/drop, the direction toggle, the ×/Add buttons,
// and expand/collapse all work), rather than a static snapshot of whatever args happened to be.
const Template = (args) => {
  const [sortCriteria, setSortCriteria] = useState(
    args.sortCriteria ?? DEFAULT_CITATION_SORT,
  );
  const [expanded, setExpanded] = useState(args.expanded ?? false);
  return (
    <CitationSort
      {...args}
      sortCriteria={sortCriteria}
      onChange={setSortCriteria}
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  );
};

export const NoSortSelected = Template.bind({});
NoSortSelected.args = {
  sortCriteria: DEFAULT_CITATION_SORT,
  expanded: true,
};

export const ClosedByDefault = Template.bind({});
ClosedByDefault.args = {
  sortCriteria: DEFAULT_CITATION_SORT,
  expanded: false,
};

export const OneCriterionSelected = Template.bind({});
OneCriterionSelected.args = {
  sortCriteria: [{ field: "Relevance", direction: "desc" }],
  expanded: true,
};

export const MultipleCriteriaSelected = Template.bind({});
MultipleCriteriaSelected.args = {
  sortCriteria: [
    { field: "Author", direction: "asc" },
    { field: "Title", direction: "desc" },
  ],
  expanded: true,
};

export const AllCriteriaSelected = Template.bind({});
AllCriteriaSelected.args = {
  sortCriteria: [
    { field: "Relevance", direction: "desc" },
    { field: "Year", direction: "asc" },
    { field: "Author", direction: "asc" },
    { field: "Title", direction: "asc" },
  ],
  expanded: true,
};
