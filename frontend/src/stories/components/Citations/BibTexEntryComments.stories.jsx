import React from "react";
import { HttpResponse, http } from "msw";
import BibTexEntryComments from "main/components/Citations/BibTexEntryComments";
import bibTexEntryCommentsFixtures from "fixtures/bibTexEntryCommentsFixtures";

// Each story uses a fixture with its own distinct entry id (see bibTexEntryCommentsFixtures.js)
// — Storybook shares one QueryClient across the whole session, so reusing an id across stories
// could let mutation-updated state leak from one story into another when navigating the sidebar.

export default {
  title: "components/Citations/BibTexEntryComments",
  component: BibTexEntryComments,
};

const Template = (args) => <BibTexEntryComments {...args} />;

function draftHandler(entryId, entry) {
  return http.put("/api/bibtexentries/comments/draft", async ({ request }) => {
    const draft = await request.text();
    window.alert(
      `Would call PUT /api/bibtexentries/comments/draft?id=${entryId}&projectId=1\n\nBody:\n${draft}`,
    );
    return HttpResponse.json({
      ...entry,
      keyValuePairs: {
        ...entry.keyValuePairs,
        CITELINES_comments_draft: draft,
      },
    });
  });
}

function saveHandler(entryId, entry) {
  return http.post("/api/bibtexentries/comments/save", () => {
    const draft = entry.keyValuePairs.CITELINES_comments_draft;
    window.alert(
      `Would call POST /api/bibtexentries/comments/save?id=${entryId}&projectId=1\n\n` +
        `Moves the draft to CITELINES_comments:\n${draft}`,
    );
    const keyValuePairs = { ...entry.keyValuePairs, CITELINES_comments: draft };
    delete keyValuePairs.CITELINES_comments_draft;
    return HttpResponse.json({ ...entry, keyValuePairs });
  });
}

function restoreHandler(entryId, entry) {
  return http.delete("/api/bibtexentries/comments/draft", () => {
    window.alert(
      `Would call DELETE /api/bibtexentries/comments/draft?id=${entryId}&projectId=1\n\n` +
        `Discards the draft; the published CITELINES_comments takes precedence again.`,
    );
    const keyValuePairs = { ...entry.keyValuePairs };
    delete keyValuePairs.CITELINES_comments_draft;
    return HttpResponse.json({ ...entry, keyValuePairs });
  });
}

export const EmptyShowsEditor = Template.bind({});
EmptyShowsEditor.args = {
  entry: bibTexEntryCommentsFixtures.neitherCommentsNorDraft,
  projectId: 1,
  autosaveIntervalMs: 2000,
};
EmptyShowsEditor.parameters = {
  msw: {
    handlers: [
      draftHandler(
        bibTexEntryCommentsFixtures.neitherCommentsNorDraft.id,
        bibTexEntryCommentsFixtures.neitherCommentsNorDraft,
      ),
    ],
  },
};

export const CommentsOnlyReadOnly = Template.bind({});
CommentsOnlyReadOnly.args = {
  entry: bibTexEntryCommentsFixtures.commentsOnly,
  projectId: 1,
};

export const CommentsOnlyEditButtonCreatesDraft = Template.bind({});
CommentsOnlyEditButtonCreatesDraft.args = {
  entry: bibTexEntryCommentsFixtures.commentsOnly,
  projectId: 1,
  autosaveIntervalMs: 2000,
};
CommentsOnlyEditButtonCreatesDraft.parameters = {
  msw: {
    handlers: [
      draftHandler(
        bibTexEntryCommentsFixtures.commentsOnly.id,
        bibTexEntryCommentsFixtures.commentsOnly,
      ),
    ],
  },
};

export const DraftOnlySideBySideAutosaving = Template.bind({});
DraftOnlySideBySideAutosaving.args = {
  entry: bibTexEntryCommentsFixtures.draftOnly,
  projectId: 1,
  autosaveIntervalMs: 2000,
};
DraftOnlySideBySideAutosaving.parameters = {
  msw: {
    handlers: [
      draftHandler(
        bibTexEntryCommentsFixtures.draftOnly.id,
        bibTexEntryCommentsFixtures.draftOnly,
      ),
    ],
  },
};

export const BothDraftAndCommentsShowsPreviousVersionButton = Template.bind({});
BothDraftAndCommentsShowsPreviousVersionButton.args = {
  entry: bibTexEntryCommentsFixtures.bothCommentsAndDraft,
  projectId: 1,
  autosaveIntervalMs: 2000,
};
BothDraftAndCommentsShowsPreviousVersionButton.parameters = {
  msw: {
    handlers: [
      draftHandler(
        bibTexEntryCommentsFixtures.bothCommentsAndDraft.id,
        bibTexEntryCommentsFixtures.bothCommentsAndDraft,
      ),
    ],
  },
};

export const SaveButtonMovesDraftToComments = Template.bind({});
SaveButtonMovesDraftToComments.args = {
  entry: {
    ...bibTexEntryCommentsFixtures.draftOnly,
    id: "comments-save-demo-1",
  },
  projectId: 1,
  autosaveIntervalMs: 2000,
};
SaveButtonMovesDraftToComments.parameters = {
  msw: {
    handlers: [
      draftHandler("comments-save-demo-1", {
        ...bibTexEntryCommentsFixtures.draftOnly,
        id: "comments-save-demo-1",
      }),
      saveHandler("comments-save-demo-1", {
        ...bibTexEntryCommentsFixtures.draftOnly,
        id: "comments-save-demo-1",
      }),
    ],
  },
};

export const PreviousVersionModalReturnToEditor = Template.bind({});
PreviousVersionModalReturnToEditor.args = {
  entry: {
    ...bibTexEntryCommentsFixtures.bothCommentsAndDraft,
    id: "comments-return-demo-1",
  },
  projectId: 1,
  autosaveIntervalMs: 2000,
};
PreviousVersionModalReturnToEditor.parameters = {
  msw: {
    handlers: [
      draftHandler("comments-return-demo-1", {
        ...bibTexEntryCommentsFixtures.bothCommentsAndDraft,
        id: "comments-return-demo-1",
      }),
    ],
  },
};

export const PreviousVersionModalRestoreVersion = Template.bind({});
PreviousVersionModalRestoreVersion.args = {
  entry: {
    ...bibTexEntryCommentsFixtures.bothCommentsAndDraft,
    id: "comments-restore-demo-1",
  },
  projectId: 1,
  autosaveIntervalMs: 2000,
};
PreviousVersionModalRestoreVersion.parameters = {
  msw: {
    handlers: [
      restoreHandler("comments-restore-demo-1", {
        ...bibTexEntryCommentsFixtures.bothCommentsAndDraft,
        id: "comments-restore-demo-1",
      }),
    ],
  },
};
