import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConceptTabComponent from "main/components/Courses/TabComponent/ConceptTabComponent";
import conceptsFixtures from "fixtures/conceptsFixtures";
import { http, HttpResponse } from "msw";

export default {
  title: "components/Courses/TabComponents/ConceptTabComponent",
  component: ConceptTabComponent,
};

const QueryWrapper = ({ children }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const Template = (args) => (
  <QueryWrapper>
    <ConceptTabComponent {...args} />
  </QueryWrapper>
);

export const Default = Template.bind({});
Default.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};

Default.parameters = {
  msw: [
    http.get("/api/concepts/course", () =>
      HttpResponse.json(conceptsFixtures.severalConcepts),
    ),
    http.post("/api/concept", async ({ request }) => {
      const body = await request.json();
      window.alert(
        "Invoked post on /api/concept with body: " + JSON.stringify(body),
      );
      return HttpResponse.json({ id: 3, ...body }, { status: 200 });
    }),
  ],
};
