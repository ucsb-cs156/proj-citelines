import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StudentCoursesTable } from "main/components/Courses/StudentCoursesTable";
import { http, HttpResponse } from "msw";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import coursesFixtures from "fixtures/coursesFixtures";

export default {
  title: "components/Courses/StudentCoursesTable",
  component: StudentCoursesTable,
};

// Create a wrapper that provides React Query context
const QueryWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in Storybook
        cacheTime: 0, // Don't cache in Storybook
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const Template = ({ args }) => (
  <QueryWrapper>
    <StudentCoursesTable {...args} />
  </QueryWrapper>
);

export const Default = Template.bind({});
Default.args = {
  testId: "CoursesTable",
};

Default.parameters = {
  msw: {
    handlers: [
      http.get("/api/currentUser", () => {
        return HttpResponse.json(apiCurrentUserFixtures.userOnly);
      }),
      http.get("/api/systemInfo", () => {
        return HttpResponse.json(systemInfoFixtures.showingNeither);
      }),
      http.get("/api/courses/list/students", () => {
        return HttpResponse.json(coursesFixtures.severalCourses);
      }),
    ],
  },
};

export const WithNoCourses = Template.bind({});
WithNoCourses.args = {
  testId: "CoursesTable",
};
WithNoCourses.parameters = {
  msw: {
    handlers: [
      http.get("/api/currentUser", () => {
        return HttpResponse.json(apiCurrentUserFixtures.userOnly);
      }),
      http.get("/api/systemInfo", () => {
        return HttpResponse.json(systemInfoFixtures.showingNeither);
      }),
      http.get("/api/courses/list/students", () => {
        return HttpResponse.json([]);
      }),
    ],
  },
};
