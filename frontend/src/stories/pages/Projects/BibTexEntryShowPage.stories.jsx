import React from "react";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router";
import BibTexEntryShowPage from "main/pages/Projects/BibTexEntryShowPage";
import bibTexEntriesFixtures from "fixtures/bibTexEntriesFixtures";
import { tagsFixtures } from "fixtures/tagsFixtures";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

// Unlike this repo's Vitest/jsdom test suites (which genuinely lack a working
// Document.createRange and so need a stub for the Comments card's CodeMirror-based Markdown
// editor), this file runs in a real browser under Storybook/Chromatic — which already has a
// fully working native createRange. A polyfill was previously copy-pasted in here too, but
// permanently overwriting the real one with a broken always-zero stub is actively harmful, not
// just unnecessary: it corrupts DOM Range measurements for every component (in this story and
// potentially — if the browser tab is reused across stories rather than reloaded — subsequently
// rendered ones too) for the rest of that browser session. See issue #114.

const PROJECT_ID = "1";
const ENTRY = bibTexEntriesFixtures.fullyFeaturedEntry;
const DUPLICATE_OF = bibTexEntriesFixtures.oneEntry;

const RAW_BIBTEX = `@${ENTRY.entryType}{${ENTRY.citeKey},
  author = {${ENTRY.keyValuePairs.author}},
  title = {${ENTRY.keyValuePairs.title}},
  year = {${ENTRY.keyValuePairs.year}},
  doi = {${ENTRY.keyValuePairs.doi}},
  citelines_relevance = {${ENTRY.keyValuePairs.citelines_relevance}},
  citelines_card_bibtex = {Open},
}
`;

const REFERENCE_ENTRIES = [
  bibTexEntriesFixtures.threeEntries[0],
  {
    ...bibTexEntriesFixtures.threeEntries[1],
    tagIds: [3],
    keyValuePairs: {
      ...bibTexEntriesFixtures.threeEntries[1].keyValuePairs,
      CITELINES_invalid_url: "True",
    },
  },
];
const CITATION_ENTRIES = [bibTexEntriesFixtures.threeEntries[2]];
const UNRESOLVED = [
  { id: "u1", direction: "reference", reason: "missing_title" },
  { id: "u2", direction: "citation", reason: "not_found_by_any_resolver" },
];

// window.alert is used throughout (per issue #55) so a reviewer can see exactly what would have
// been transmitted to the backend for each POST/PUT/PATCH/DELETE action, without a live backend.
function alertingHandler(method, url, describe) {
  return http[method](url, async ({ request }) => {
    const params = new URL(request.url).search;
    const body =
      request.headers.get("content-type") === "text/plain"
        ? await request.text()
        : null;
    window.alert(
      `Would ${method.toUpperCase()} ${url}${params}` +
        (body ? `\n\nBody:\n${body}` : "") +
        (describe ? `\n\n${describe}` : ""),
    );
    return HttpResponse.json(ENTRY);
  });
}

const commonHandlers = [
  http.get("/api/currentUser", () =>
    HttpResponse.json(apiCurrentUserFixtures.researcherUser),
  ),
  http.get("/api/systemInfo", () =>
    HttpResponse.json(systemInfoFixtures.showingNeither),
  ),
  http.get("/api/projects/:id", () =>
    HttpResponse.json({ id: 1, citationFormat: "APA" }),
  ),
  http.get("/api/tags/project", () =>
    HttpResponse.json(tagsFixtures.threeTags),
  ),
  // Neither References nor Citations panel has a saved filter yet in this story, so this always
  // returns the same unsaved default (issue #121).
  http.get("/api/citationfilterstate", () =>
    HttpResponse.json({
      relevance: ["High", "Medium", "Low", "None", "Unreviewed"],
      link: "all",
      duplicates: "all",
      search: "",
      tagIds: [],
      tagMode: "and",
      expanded: false,
    }),
  ),
  // Same as above, for the sort panel (issue #126).
  http.get("/api/citationsortstate", () =>
    HttpResponse.json({ sortCriteria: [], expanded: false }),
  ),
];

const mutationHandlers = [
  alertingHandler(
    "post",
    "/api/bibtexentries/tags",
    "Adds a tag to this entry.",
  ),
  alertingHandler(
    "delete",
    "/api/bibtexentries/tags",
    "Removes a tag from this entry.",
  ),
  alertingHandler(
    "put",
    "/api/bibtexentries",
    "Used for relevance changes, card open/closed persistence, and the BibTex Edit modal alike.",
  ),
  alertingHandler(
    "post",
    "/api/citationfilterstate",
    "Saves the References/Citations filter panel's state.",
  ),
  alertingHandler(
    "post",
    "/api/citationsortstate",
    "Saves the References/Citations sort panel's state.",
  ),
  alertingHandler(
    "patch",
    "/api/bibtexentries/abstract",
    "Updates the abstract.",
  ),
  alertingHandler("delete", "/api/bibtexentries/delete", "Deletes this entry."),
  alertingHandler(
    "post",
    "/api/jobs/launch/getReferences",
    "Launches the Get References job.",
  ),
  alertingHandler(
    "post",
    "/api/jobs/launch/getCitations",
    "Launches the Get Citations job.",
  ),
  alertingHandler(
    "post",
    "/api/jobs/launch/improveBibTexEntries",
    "Launches the Improve BibTeX Entries job.",
  ),
  alertingHandler(
    "post",
    "/api/bibtexentries/post",
    "Adds a Reference or Citation (or, in edit/create flows elsewhere, a new entry).",
  ),
  alertingHandler(
    "post",
    "/api/jobs/launch/bulkCitationUploadFromAcmDlViewAll",
    "Launches the Bulk Citations job.",
  ),
  alertingHandler(
    "post",
    "/api/jobs/launch/bulkReferenceUploadFromAcmDl",
    "Launches the Bulk References job.",
  ),
  alertingHandler("post", "/api/tags/post", "Creates a new project tag."),
  alertingHandler(
    "put",
    "/api/bibtexentries/comments/draft",
    "Autosaves the draft comments.",
  ),
  alertingHandler(
    "post",
    "/api/bibtexentries/comments/save",
    "Publishes the draft comments.",
  ),
  alertingHandler(
    "delete",
    "/api/bibtexentries/comments/draft",
    "Discards the draft comments.",
  ),
];

function formattedCitationHandler() {
  return http.get("/api/bibtexentries/formatted", ({ request }) => {
    const id = new URL(request.url).searchParams.get("id");
    if (id === DUPLICATE_OF.id) {
      return HttpResponse.text(
        "Smith, J., & Doe, J. (2020). A Very Long Title That Goes On and On.",
      );
    }
    return HttpResponse.text(
      "Fully, A., & Featured, J. (2024). A Fully Featured Example Paper, for the Storybook Demo.",
    );
  });
}

export default {
  title: "pages/Projects/BibTexEntryShowPage",
  component: BibTexEntryShowPage,
  // Not `parameters: { msw: { handlers: commonHandlers } }` here — msw-storybook-addon doesn't
  // merge a default-export-level handlers list into each story's own, so it would be silently
  // ignored; commonHandlers is spread into every story below instead.
  parameters: {
    reactRouter: {
      initialEntries: [`/project/${PROJECT_ID}/bibtex/${ENTRY.id}`],
    },
  },
};

const Template = () => (
  <Routes>
    <Route
      path="/project/:id/bibtex/:entryId"
      element={<BibTexEntryShowPage />}
    />
  </Routes>
);

export const Default = Template.bind({});
Default.parameters = {
  // msw-storybook-addon does not merge the default export's parameters.msw.handlers into each
  // story automatically — a story's own handlers list replaces it entirely, not extends it — so
  // commonHandlers has to be spread into every story here, not just declared once above.
  msw: {
    handlers: [
      ...commonHandlers,
      http.get("/api/bibtexentries/entry", () => HttpResponse.json(ENTRY)),
      formattedCitationHandler(),
      http.get("/api/bibtexentries/export", () =>
        HttpResponse.text(RAW_BIBTEX),
      ),
      http.get("/api/citationedges/references", () =>
        HttpResponse.json(REFERENCE_ENTRIES),
      ),
      http.get("/api/citationedges/citations", () =>
        HttpResponse.json(CITATION_ENTRIES),
      ),
      http.get("/api/citationedges/unresolved", () =>
        HttpResponse.json(UNRESOLVED),
      ),
      ...mutationHandlers,
    ],
  },
};

export const Loading = Template.bind({});
Loading.parameters = {
  msw: {
    handlers: [
      ...commonHandlers,
      // Never resolves, so the page stays on its "Citation: Loading..." state indefinitely.
      http.get("/api/bibtexentries/entry", () => new Promise(() => {})),
    ],
  },
};

export const EntryNotFound = Template.bind({});
EntryNotFound.parameters = {
  msw: {
    handlers: [
      ...commonHandlers,
      http.get("/api/bibtexentries/entry", () =>
        HttpResponse.json({ message: "Entry not found" }, { status: 404 }),
      ),
    ],
  },
};
