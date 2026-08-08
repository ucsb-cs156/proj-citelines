import React from "react";

import CoursesTable from "main/components/Courses/CoursesTable";
import coursesFixtures from "fixtures/coursesFixtures";

export default {
  title: "components/Courses/CoursesTable",
  component: CoursesTable,
};

const Template = (args) => {
  let [loading, setLoading] = React.useState(false);

  const isLoading = () => loading;
  return <CoursesTable isLoading={isLoading} {...args} />;
};

export const Empty = Template.bind({});
export const ManyCourses = Template.bind({});

Empty.args = {
  courses: [],
};
Empty.parameters = {};

ManyCourses.args = {
  courses: coursesFixtures.severalCourses,
};
ManyCourses.parameters = {};
