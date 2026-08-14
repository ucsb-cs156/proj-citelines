import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import BibTexEntryComments from "main/components/Citations/BibTexEntryComments";
import bibTexEntryCommentsFixtures from "fixtures/bibTexEntryCommentsFixtures";

// CodeMirror (used internally by the Markdown editor) needs a working Document.createRange,
// which jsdom does not provide — same polyfill react-simplemde-editor's own test suite uses.
Document.prototype.createRange = function () {
  return {
    setEnd: function () {},
    setStart: function () {},
    getBoundingClientRect: function () {
      return { right: 0 };
    },
    getClientRects: function () {
      return { length: 0, left: 0, right: 0 };
    },
  };
};

function renderComments(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BibTexEntryComments projectId={1} autosaveIntervalMs={50} {...props} />
    </QueryClientProvider>,
  );
}

describe("BibTexEntryComments tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  test("shows an empty editor, no Draft badge, and no See-previous-version button when neither comments nor draft exist", () => {
    renderComments({
      entry: bibTexEntryCommentsFixtures.neitherCommentsNorDraft,
    });

    expect(
      screen.getByTestId("BibTexEntryComments-editor-pane"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryComments-draft-badge"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryComments-see-previous-version-button"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryComments-rendered"),
    ).not.toBeInTheDocument();
  });

  test("shows rendered markdown and an Edit button when only comments exist", () => {
    renderComments({ entry: bibTexEntryCommentsFixtures.commentsOnly });

    expect(
      screen.getByTestId("BibTexEntryComments-rendered"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Summary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryComments-edit-button"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryComments-editor-pane"),
    ).not.toBeInTheDocument();
  });

  test("clicking Edit switches to edit mode, pre-filled with the existing comments, with a Cancel button and no Draft badge", async () => {
    renderComments({ entry: bibTexEntryCommentsFixtures.commentsOnly });

    fireEvent.click(screen.getByTestId("BibTexEntryComments-edit-button"));

    expect(
      screen.getByTestId("BibTexEntryComments-editor-pane"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryComments-cancel-button"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryComments-draft-badge"),
    ).not.toBeInTheDocument();
    await screen.findByRole("textbox");
    // CodeMirror renders the editor's content into its own visual DOM overlay, not the
    // underlying textarea's `value` attribute — check the rendered text, matching the
    // convention react-simplemde-editor's own test suite uses.
    expect(screen.getByText(/This paper introduces a/)).toBeInTheDocument();
  });

  test("clicking Cancel after Edit returns to view mode without ever calling the backend", async () => {
    renderComments({ entry: bibTexEntryCommentsFixtures.commentsOnly });

    fireEvent.click(screen.getByTestId("BibTexEntryComments-edit-button"));
    await screen.findByTestId("BibTexEntryComments-cancel-button");
    fireEvent.click(screen.getByTestId("BibTexEntryComments-cancel-button"));

    expect(
      screen.getByTestId("BibTexEntryComments-rendered"),
    ).toBeInTheDocument();
    expect(axiosMock.history.put.length).toBe(0);
  });

  test("shows a side-by-side editor and preview with a Draft badge, and no See-previous-version button, when only a draft exists", () => {
    renderComments({ entry: bibTexEntryCommentsFixtures.draftOnly });

    expect(
      screen.getByTestId("BibTexEntryComments-editor-pane"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryComments-preview-pane"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryComments-draft-badge"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryComments-save-button"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("BibTexEntryComments-see-previous-version-button"),
    ).not.toBeInTheDocument();
  });

  test("shows the See-previous-version button when both comments and a draft exist", () => {
    renderComments({ entry: bibTexEntryCommentsFixtures.bothCommentsAndDraft });

    expect(
      screen.getByTestId("BibTexEntryComments-see-previous-version-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("BibTexEntryComments-draft-badge"),
    ).toBeInTheDocument();
  });

  test("typing in the editor autosaves the draft after the interval elapses", async () => {
    axiosMock.onPut("/api/bibtexentries/comments/draft").reply(200, {
      ...bibTexEntryCommentsFixtures.draftOnly,
      keyValuePairs: {
        ...bibTexEntryCommentsFixtures.draftOnly.keyValuePairs,
        CITELINES_comments_draft: "Updated draft text",
      },
    });
    renderComments({ entry: bibTexEntryCommentsFixtures.draftOnly });

    const editor = await screen.findByRole("textbox");
    await userEvent.type(editor, " more");

    await waitFor(
      () => expect(axiosMock.history.put.length).toBeGreaterThan(0),
      {
        timeout: 3000,
      },
    );
    expect(axiosMock.history.put[0].url).toBe(
      "/api/bibtexentries/comments/draft",
    );
    expect(axiosMock.history.put[0].params).toEqual({
      id: bibTexEntryCommentsFixtures.draftOnly.id,
      projectId: 1,
    });
  });

  test("the autosave heartbeat does not call the backend again when nothing has changed", async () => {
    axiosMock.onPut("/api/bibtexentries/comments/draft").reply(200, {
      ...bibTexEntryCommentsFixtures.draftOnly,
    });
    renderComments({ entry: bibTexEntryCommentsFixtures.draftOnly });

    // wait several intervals' worth of time without typing anything
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(axiosMock.history.put.length).toBe(0);
  });

  test("clicking Save when not dirty saves directly, without an autosave PUT first", async () => {
    axiosMock.onPost("/api/bibtexentries/comments/save").reply(200, {
      ...bibTexEntryCommentsFixtures.draftOnly,
      keyValuePairs: {
        title: bibTexEntryCommentsFixtures.draftOnly.keyValuePairs.title,
        CITELINES_comments:
          bibTexEntryCommentsFixtures.draftOnly.keyValuePairs
            .CITELINES_comments_draft,
      },
    });
    renderComments({ entry: bibTexEntryCommentsFixtures.draftOnly });

    fireEvent.click(screen.getByTestId("BibTexEntryComments-save-button"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.put.length).toBe(0);
    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryComments-rendered"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("BibTexEntryComments-draft-badge"),
    ).not.toBeInTheDocument();
  });

  test("clicking Save while dirty first autosaves the draft, then saves it", async () => {
    axiosMock.onPut("/api/bibtexentries/comments/draft").reply(200, {
      ...bibTexEntryCommentsFixtures.draftOnly,
      keyValuePairs: {
        ...bibTexEntryCommentsFixtures.draftOnly.keyValuePairs,
        CITELINES_comments_draft: "Draft text more",
      },
    });
    axiosMock.onPost("/api/bibtexentries/comments/save").reply(200, {
      ...bibTexEntryCommentsFixtures.draftOnly,
      keyValuePairs: {
        title: bibTexEntryCommentsFixtures.draftOnly.keyValuePairs.title,
        CITELINES_comments: "Draft text more",
      },
    });
    renderComments({
      entry: bibTexEntryCommentsFixtures.draftOnly,
      autosaveIntervalMs: 100000,
    });

    const editor = await screen.findByRole("textbox");
    await userEvent.type(editor, " more");
    fireEvent.click(screen.getByTestId("BibTexEntryComments-save-button"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.put.length).toBe(1);
  });

  test("See previous version modal shows the published markdown; Return to Editor closes it", async () => {
    renderComments({ entry: bibTexEntryCommentsFixtures.bothCommentsAndDraft });

    fireEvent.click(
      screen.getByTestId("BibTexEntryComments-see-previous-version-button"),
    );

    expect(
      screen.getByTestId("BibTexEntryComments-PreviousVersionModal-source"),
    ).toHaveTextContent("A solid paper with a few limitations");

    fireEvent.click(
      screen.getByTestId(
        "BibTexEntryComments-PreviousVersionModal-return-button",
      ),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId("BibTexEntryComments-PreviousVersionModal-source"),
      ).not.toBeInTheDocument();
    });
    // the editor is untouched, still in edit mode with the draft intact
    expect(
      screen.getByTestId("BibTexEntryComments-draft-badge"),
    ).toBeInTheDocument();
  });

  test("Restore this Version discards the draft and returns to view mode showing the published comments", async () => {
    axiosMock.onDelete("/api/bibtexentries/comments/draft").reply(200, {
      ...bibTexEntryCommentsFixtures.bothCommentsAndDraft,
      keyValuePairs: {
        title:
          bibTexEntryCommentsFixtures.bothCommentsAndDraft.keyValuePairs.title,
        CITELINES_comments:
          bibTexEntryCommentsFixtures.bothCommentsAndDraft.keyValuePairs
            .CITELINES_comments,
      },
    });
    renderComments({ entry: bibTexEntryCommentsFixtures.bothCommentsAndDraft });

    fireEvent.click(
      screen.getByTestId("BibTexEntryComments-see-previous-version-button"),
    );
    fireEvent.click(
      screen.getByTestId(
        "BibTexEntryComments-PreviousVersionModal-restore-button",
      ),
    );

    await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
    expect(axiosMock.history.delete[0].params).toEqual({
      id: bibTexEntryCommentsFixtures.bothCommentsAndDraft.id,
      projectId: 1,
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("BibTexEntryComments-rendered"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("BibTexEntryComments-draft-badge"),
    ).not.toBeInTheDocument();
  });
});
