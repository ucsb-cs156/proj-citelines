import React from "react";
import TagPill from "main/components/Tags/TagPill";

export default {
  title: "components/Tags/TagPill",
  component: TagPill,
};

const Template = (args) => <TagPill {...args} />;

export const WithExplanation = Template.bind({});
WithExplanation.args = {
  tag: {
    id: 1,
    tag: "methodology",
    explanation: "Describes the research methodology used in the paper.",
    color: "#1e88e5",
  },
  testId: "TagPill",
};

export const WithoutExplanation = Template.bind({});
WithoutExplanation.args = {
  tag: { id: 2, tag: "untitled", color: "#43a047" },
  testId: "TagPill",
};

export const DefaultColor = Template.bind({});
DefaultColor.args = {
  tag: { id: 3, tag: "no-color-set" },
  testId: "TagPill",
};
