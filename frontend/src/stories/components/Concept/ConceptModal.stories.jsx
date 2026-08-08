import React, { useState } from "react";
import { Button } from "react-bootstrap";
import ConceptModal from "main/components/Concept/ConceptModal";
import conceptsFixtures from "fixtures/conceptsFixtures";

export default {
  title: "components/Concept/ConceptModal",
  component: ConceptModal,
};

const Template = (args) => {
  const [modal, setModalState] = useState(false);

  return (
    <>
      <Button onClick={() => setModalState(true)}>Open Modal</Button>
      <ConceptModal
        showModal={modal}
        toggleShowModal={setModalState}
        {...args}
      />
    </>
  );
};

export const Create = Template.bind({});

Create.args = {
  buttonText: "Create",
  onSubmitAction: (data) => {
    console.log("Submit was clicked with data: ", data);
    window.alert("Submit was clicked with data: " + JSON.stringify(data));
  },
};

export const Update = Template.bind({});

Update.args = {
  initialContents: conceptsFixtures.severalConcepts[0],
  buttonText: "Update",
  modalTitle: "Update Concept",
  onSubmitAction: (data) => {
    console.log("Submit was clicked with data: ", data);
    window.alert("Submit was clicked with data: " + JSON.stringify(data));
  },
};
