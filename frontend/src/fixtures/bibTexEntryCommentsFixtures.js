// Fixtures for the four BibTexEntryComments states. Each uses a distinct entry id: every
// Storybook story shares one QueryClient across the whole session (see .storybook/preview.jsx),
// so reusing an id across stories could let React Query cache leak between them when navigating
// the sidebar.
const bibTexEntryCommentsFixtures = {
  neitherCommentsNorDraft: {
    id: "comments-neither-1",
    projectId: 1,
    entryType: "article",
    citeKey: "empty2024",
    keyValuePairs: {
      title: "A Paper With No Comments Yet",
    },
  },
  commentsOnly: {
    id: "comments-published-only-1",
    projectId: 1,
    entryType: "article",
    citeKey: "published2024",
    keyValuePairs: {
      title: "A Paper With Published Comments",
      CITELINES_comments:
        "## Summary\n\nThis paper introduces a **novel** approach to citation tracking.\n\n" +
        "- Strong methodology\n- Clear writing\n- Reproducible results\n",
    },
  },
  draftOnly: {
    id: "comments-draft-only-1",
    projectId: 1,
    entryType: "article",
    citeKey: "draftonly2024",
    keyValuePairs: {
      title: "A Paper With Only a Draft",
      CITELINES_comments_draft:
        "## Initial thoughts\n\nStill *drafting* my notes on this one...\n",
    },
  },
  bothCommentsAndDraft: {
    id: "comments-both-1",
    projectId: 1,
    entryType: "article",
    citeKey: "revising2024",
    keyValuePairs: {
      title: "A Paper Being Revised",
      CITELINES_comments:
        "## Summary\n\nA solid paper with a few limitations in the evaluation section.\n",
      CITELINES_comments_draft:
        "## Summary\n\nA solid paper with a few limitations in the evaluation section.\n\n" +
        "**Update:** re-read the appendix, the evaluation is actually more thorough than I " +
        "first thought.\n",
    },
  },
};

export default bibTexEntryCommentsFixtures;
