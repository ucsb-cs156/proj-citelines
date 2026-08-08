import React from "react";
import ConceptTable from "main/components/Concept/ConceptTable";
import conceptsFixtures from "fixtures/conceptsFixtures";

export default {
  title: "components/Concept/ConceptTable",
  component: ConceptTable,
};

const Template = (args) => <ConceptTable {...args} />;

export const Empty = Template.bind({});

Empty.args = {
  concepts: [],
};

export const ManyConcepts = Template.bind({});

ManyConcepts.args = {
  concepts: conceptsFixtures.severalConcepts,
  editCallback: () => window.alert("Edit clicked"),
  deleteCallback: () => window.alert("Delete clicked"),
};
