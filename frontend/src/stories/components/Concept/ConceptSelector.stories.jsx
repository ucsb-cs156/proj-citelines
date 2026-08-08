import React from "react";
import { http, HttpResponse } from "msw";
import ConceptSelector from "main/components/Concept/ConceptSelector";
import conceptsFixtures from "fixtures/conceptsFixtures";

export default {
  title: "components/Concept/ConceptSelector",
  component: ConceptSelector,
};

const Template = (args) => <ConceptSelector {...args} />;

export const Default = Template.bind({});

Default.args = {
  courseId: 1,
  onSelect: (concept) =>
    window.alert(
      "Selected concept: " + (concept ? JSON.stringify(concept) : "none"),
    ),
};

Default.parameters = {
  msw: [
    http.get("/api/concepts/top-level", () => {
      return HttpResponse.json(conceptsFixtures.severalConcepts);
    }),
  ],
};

export const Empty = Template.bind({});

Empty.args = {
  courseId: 2,
  onSelect: (concept) =>
    window.alert(
      "Selected concept: " + (concept ? JSON.stringify(concept) : "none"),
    ),
};

Empty.parameters = {
  msw: [
    http.get("/api/concepts/top-level", () => {
      return HttpResponse.json([]);
    }),
  ],
};
