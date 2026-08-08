import React from "react";
import { http, HttpResponse } from "msw";
import SubConceptTabComponent from "main/components/Courses/TabComponent/SubConceptTabComponent";
import subConceptsFixtures from "fixtures/subConceptsFixtures";
import conceptsFixtures from "fixtures/conceptsFixtures";

export default {
  title: "components/Courses/TabComponents/SubConceptTabComponent",
  component: SubConceptTabComponent,
};

const Template = (args) => <SubConceptTabComponent {...args} />;

export const Default = Template.bind({});
Default.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};

Default.parameters = {
  msw: [
    http.get("/api/concepts/subconcepts", () => {
      return HttpResponse.json(subConceptsFixtures.severalSubConcepts);
    }),
    http.get("/api/concepts/top-level", () => {
      return HttpResponse.json(conceptsFixtures.severalConcepts);
    }),
    http.post("/api/concept/subconcept", async ({ request }) => {
      const body = await request.json();
      window.alert(
        `Create subconcept endpoint invoked with: ${JSON.stringify(body)}`,
      );
      return HttpResponse.json(
        { id: 99, label: body.label, parentId: body.parentConceptId },
        { status: 201 },
      );
    }),
  ],
};
