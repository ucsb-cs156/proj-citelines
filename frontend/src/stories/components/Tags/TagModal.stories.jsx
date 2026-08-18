import React from "react";
import TagModal from "main/components/Tags/TagModal";
import { tagsFixtures } from "fixtures/tagsFixtures";

export default {
  title: "components/Tags/TagModal",
  component: TagModal,
};

const Template = (args) => <TagModal {...args} />;

export const Create = Template.bind({});
Create.args = {
  showModal: true,
  toggleShowModal: () => {},
  onSubmitAction: (data) =>
    window.alert(`Would create tag with:\n${JSON.stringify(data, null, 2)}`),
};

export const Edit = Template.bind({});
Edit.args = {
  showModal: true,
  toggleShowModal: () => {},
  onSubmitAction: (data) =>
    window.alert(`Would update tag with:\n${JSON.stringify(data, null, 2)}`),
  initialContents: tagsFixtures.threeTags[0],
  buttonText: "Update",
  modalTitle: "Edit Tag",
};
