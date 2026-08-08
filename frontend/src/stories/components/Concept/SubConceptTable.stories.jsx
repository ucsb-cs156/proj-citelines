import React from "react";
import SubConceptTable from "main/components/Concept/SubConceptTable";
import subConceptsFixtures from "fixtures/subConceptsFixtures";

export default {
  title: "components/Concept/SubConceptTable",
  component: SubConceptTable,
};

const Template = (args) => <SubConceptTable {...args} />;

export const Empty = Template.bind({});

Empty.args = {
  subConcepts: [],
};

export const ManySubConcepts = Template.bind({});

ManySubConcepts.args = {
  subConcepts: subConceptsFixtures.severalSubConcepts,
  editCallback: () => window.alert("Edit clicked"),
  deleteCallback: () => window.alert("Delete clicked"),
};
