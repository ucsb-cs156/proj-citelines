import React from "react";
import TagSelector from "main/components/Tags/TagSelector";
import { tagsFixtures } from "fixtures/tagsFixtures";

export default {
  title: "components/Tags/TagSelector",
  component: TagSelector,
};

const Template = (args) => <TagSelector {...args} />;

export const Empty = Template.bind({});
Empty.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: [],
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};

export const SomeAssigned = Template.bind({});
SomeAssigned.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: [tagsFixtures.threeTags[0]],
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};

export const AllAssigned = Template.bind({});
AllAssigned.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: tagsFixtures.threeTags,
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};

export const ReadOnly = Template.bind({});
ReadOnly.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: tagsFixtures.threeTags,
  projectId: 1,
  canEdit: false,
};
