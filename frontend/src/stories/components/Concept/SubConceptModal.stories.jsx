import React, { useState } from "react";
import { Button } from "react-bootstrap";
import SubConceptModal from "main/components/Concept/SubConceptModal";
import subConceptsFixtures from "fixtures/subConceptsFixtures";

export default {
  title: "components/Concept/SubConceptModal",
  component: SubConceptModal,
};

const Template = (args) => {
  const [modal, setModalState] = useState(false);

  return (
    <>
      <Button onClick={() => setModalState(true)}>Open Modal</Button>
      <SubConceptModal
        showModal={modal}
        toggleShowModal={setModalState}
        {...args}
      />
    </>
  );
};

export const Create = Template.bind({});

Create.args = {
  initialContents: {
    parentId: 1,
    parentLabel: "Variables",
  },
  buttonText: "Create",
  onSubmitAction: (data) => {
    console.log("Submit was clicked with data: ", data);
    window.alert("Submit was clicked with data: " + JSON.stringify(data));
  },
};

export const Update = Template.bind({});

Update.args = {
  initialContents: subConceptsFixtures.severalSubConcepts[0],
  buttonText: "Update",
  modalTitle: "Update SubConcept",
  onSubmitAction: (data) => {
    console.log("Submit was clicked with data: ", data);
    window.alert("Submit was clicked with data: " + JSON.stringify(data));
  },
};
