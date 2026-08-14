import React from "react";
import PreviousVersionModal from "main/components/Citations/PreviousVersionModal";

export default {
  title: "components/Citations/PreviousVersionModal",
  component: PreviousVersionModal,
};

const Template = (args) => <PreviousVersionModal {...args} />;

const SAMPLE_MARKDOWN =
  "## Summary\n\nThis paper introduces a **novel** approach.\n\n" +
  "- Strong methodology\n- Clear writing\n";

export const Open = Template.bind({});
Open.args = {
  show: true,
  publishedMarkdown: SAMPLE_MARKDOWN,
  onHide: () => window.alert("Would dismiss the modal (Return to Editor)."),
  onRestore: () =>
    window.alert(
      "Would call DELETE /api/bibtexentries/comments/draft, discarding the draft.",
    ),
};

export const Restoring = Template.bind({});
Restoring.args = {
  ...Open.args,
  isRestoring: true,
};
