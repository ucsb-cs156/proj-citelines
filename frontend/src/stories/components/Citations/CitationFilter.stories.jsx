import React, { useState } from "react";
import CitationFilter from "main/components/Citations/CitationFilter";
import { DEFAULT_CITATION_FILTER } from "main/utils/citationFilter";
import { tagsFixtures } from "fixtures/tagsFixtures";

export default {
  title: "components/Citations/CitationFilter",
  component: CitationFilter,
};

// CitationFilter is a controlled component (value/onChange, like ColorChooser; the open/closed
// state is controlled the same way, issue #122) — this Template wraps both in local state so the
// story is actually interactive, rather than a static snapshot of whatever args happened to be.
const Template = (args) => {
  const [filter, setFilter] = useState(args.filter ?? DEFAULT_CITATION_FILTER);
  const [expanded, setExpanded] = useState(args.expanded ?? false);
  return (
    <CitationFilter
      {...args}
      filter={filter}
      onChange={setFilter}
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  );
};

export const Default = Template.bind({});
Default.args = {
  filter: DEFAULT_CITATION_FILTER,
  allTags: tagsFixtures.threeTags,
  expanded: true,
};

export const ClosedByDefault = Template.bind({});
ClosedByDefault.args = {
  filter: DEFAULT_CITATION_FILTER,
  allTags: tagsFixtures.threeTags,
  expanded: false,
};

export const SomeTagsAlreadySelected = Template.bind({});
SomeTagsAlreadySelected.args = {
  filter: {
    ...DEFAULT_CITATION_FILTER,
    tagIds: [tagsFixtures.threeTags[0].id],
  },
  allTags: tagsFixtures.threeTags,
  expanded: true,
};

export const NarrowedFilter = Template.bind({});
NarrowedFilter.args = {
  filter: {
    ...DEFAULT_CITATION_FILTER,
    relevance: ["High", "Medium"],
    link: "doi",
    duplicates: "no-dup",
    search: "smith",
    tagIds: [tagsFixtures.threeTags[1].id, tagsFixtures.threeTags[2].id],
    tagMode: "and",
  },
  allTags: tagsFixtures.threeTags,
  expanded: true,
};

export const NoTagsAvailable = Template.bind({});
NoTagsAvailable.args = {
  filter: DEFAULT_CITATION_FILTER,
  allTags: [],
  expanded: true,
};
