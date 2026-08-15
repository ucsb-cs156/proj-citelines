import React from "react";
import ProjectModal from "main/components/Projects/ProjectModal";

export default {
  title: "components/Projects/ProjectModal",
  component: ProjectModal,
};

const Template = (args) => <ProjectModal {...args} />;

export const Create = Template.bind({});
Create.args = {
  showModal: true,
  toggleShowModal: () => {},
  onSubmitAction: (data) =>
    window.alert(
      `Would create project with:\n${JSON.stringify(data, null, 2)}`,
    ),
};

export const Edit = Template.bind({});
Edit.args = {
  showModal: true,
  toggleShowModal: () => {},
  onSubmitAction: (data) =>
    window.alert(
      `Would update project with:\n${JSON.stringify(data, null, 2)}`,
    ),
  initialContents: {
    name: "Citation Graphs",
    description: "A project studying citation graphs in CS education",
    citationFormat: "IEEE",
  },
  buttonText: "Update",
  modalTitle: "Edit Project",
};
