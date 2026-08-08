import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EdgeConceptTabComponent from "main/components/Courses/TabComponent/EdgeConceptTabComponent";
import conceptsFixtures from "fixtures/conceptsFixtures";
import edgesFixtures from "fixtures/edgesFixtures";
import { http, HttpResponse } from "msw";

export default {
  title: "components/Courses/TabComponents/EdgeConceptTabComponent",
  component: EdgeConceptTabComponent,
};

const QueryWrapper = ({ children }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const Template = (args) => (
  <QueryWrapper>
    <EdgeConceptTabComponent {...args} />
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
    http.get("/api/concepts/edges", () =>
      HttpResponse.json(edgesFixtures.severalEdges),
    ),
    http.post("/api/concepts/edges/post", ({ request }) => {
      const url = new URL(request.url);
      window.alert(
        "Invoked post on /api/concepts/edges/post with params: " +
          url.searchParams.toString(),
      );
      return HttpResponse.json(
        {
          id: 99,
          sourceId: Number(url.searchParams.get("sourceConceptId")),
          targetId: Number(url.searchParams.get("targetConceptId")),
          color: null,
        },
        { status: 200 },
      );
    }),
    http.delete("/api/concepts/edges/delete", ({ request }) => {
      const url = new URL(request.url);
      window.alert(
        "Invoked delete on /api/concepts/edges/delete with params: " +
          url.searchParams.toString(),
      );
      return HttpResponse.json(
        {
          message: `ConceptEdge with id ${url.searchParams.get("id")} deleted`,
        },
        { status: 200 },
      );
    }),
  ],
};
