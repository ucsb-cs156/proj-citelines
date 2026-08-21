import React, { useState } from "react";
import CitationSort from "main/components/Citations/CitationSort";
import { DEFAULT_CITATION_SORT } from "main/utils/citationSort";

export default {
  title: "components/Citations/CitationSort",
  component: CitationSort,
};

// CitationSort is a controlled component (value/onChange, like CitationFilter/ColorChooser) —
// this Template wraps it in local state so the story is actually interactive (drag/drop and the
// ↑/↓/×/Add buttons all work), rather than a static snapshot of whatever args.sortCriteria
// happened to be.
const Template = (args) => {
  const [sortCriteria, setSortCriteria] = useState(
    args.sortCriteria ?? DEFAULT_CITATION_SORT,
  );
  return (
    <CitationSort
      {...args}
      sortCriteria={sortCriteria}
      onChange={setSortCriteria}
    />
  );
};

export const NoSortSelected = Template.bind({});
NoSortSelected.args = {
  sortCriteria: DEFAULT_CITATION_SORT,
};

export const OneCriterionSelected = Template.bind({});
OneCriterionSelected.args = {
  sortCriteria: ["Relevance"],
};

export const MultipleCriteriaSelected = Template.bind({});
MultipleCriteriaSelected.args = {
  sortCriteria: ["Author", "Title"],
};

export const AllCriteriaSelected = Template.bind({});
AllCriteriaSelected.args = {
  sortCriteria: ["Relevance", "Year", "Author", "Title"],
};
