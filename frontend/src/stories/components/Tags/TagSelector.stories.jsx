import React from "react";
import { HttpResponse, http } from "msw";
import TagSelector from "main/components/Tags/TagSelector";
import { tagsFixtures } from "fixtures/tagsFixtures";

export default {
  title: "components/Tags/TagSelector",
  component: TagSelector,
};

const Template = (args) => <TagSelector {...args} />;

// TagSelector's "New Tag" button submits a real POST /api/tags/post via useBackendMutation;
// Storybook has no live backend, so this MSW handler stands in for it (see the New Tag story).
const newTagHandler = http.post("/api/tags/post", async ({ request }) => {
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag");
  const explanation = url.searchParams.get("explanation");
  window.alert(`Would create tag "${tag}": ${explanation}`);
  return HttpResponse.json({ id: 99, tag, explanation, color: "" });
});

export const Empty = Template.bind({});
Empty.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: [],
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};
Empty.parameters = { msw: { handlers: [newTagHandler] } };

export const SomeAssigned = Template.bind({});
SomeAssigned.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: [tagsFixtures.threeTags[0]],
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};
SomeAssigned.parameters = { msw: { handlers: [newTagHandler] } };

export const AllAssigned = Template.bind({});
AllAssigned.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: tagsFixtures.threeTags,
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};
AllAssigned.parameters = { msw: { handlers: [newTagHandler] } };

export const ReadOnly = Template.bind({});
ReadOnly.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: tagsFixtures.threeTags,
  projectId: 1,
  canEdit: false,
};

// canEdit=true, but click "New Tag" to see the create-tag modal (TagModal, reused from the Tags
// tab — see issue #85) without needing to also assign/add tags.
export const CreatingANewTag = Template.bind({});
CreatingANewTag.args = {
  allTags: tagsFixtures.threeTags,
  assignedTags: [],
  projectId: 1,
  onAddTag: (tag) => window.alert(`Would add tag: ${tag.tag}`),
  onRemoveTag: (tag) => window.alert(`Would remove tag: ${tag.tag}`),
};
CreatingANewTag.parameters = { msw: { handlers: [newTagHandler] } };
