import React from "react";
import BibTexEntryLink from "main/components/Citations/BibTexEntryLink";

export default {
  title: "components/Citations/BibTexEntryLink",
  component: BibTexEntryLink,
};

const Template = (args) => <BibTexEntryLink {...args} />;

export const WithDoi = Template.bind({});
WithDoi.args = {
  keyValuePairs: { doi: "10.1038/s41586-020-2649-2" },
};

export const WithUrlOnly = Template.bind({});
WithUrlOnly.args = {
  keyValuePairs: { url: "https://example.org/jones2019" },
};

export const WithNeitherDoiNorUrl = Template.bind({});
WithNeitherDoiNorUrl.args = {
  keyValuePairs: { author: "Jane Q. Smith", title: "A Very Long Title" },
};
