import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import ScaffoldConceptGraph from "main/components/Scaffold/ScaffoldConceptGraph";
import ConceptModal from "main/components/Concept/ConceptModal";
import SubConceptModal from "main/components/Concept/SubConceptModal";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";

import { useQueryClient } from "@tanstack/react-query";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import type {
  Assessment,
  Course,
  Question,
  QuestionConcept,
  MajorConceptDTO,
  SubconceptDTO,
  ConceptContentDTO,
  PositionDTO,
  EdgeDTO,
  UserStateResponse,
} from "main/types/conceptGraph";
import LoginScreen from "main/components/Auth/LoginScreen";
import ScaffoldTopBar from "main/components/Scaffold/ScaffoldTopBar";
import type { CourseAccess } from "main/components/Courses/CourseMenu";
import { useCurrentUser } from "main/utils/currentUser";
import { StaffToolsProvider } from "main/utils/staffTools";
import { useStaffTools } from "main/utils/useStaffTools";
import {
  normalize,
  toPastel,
  computeScaffoldSubgraph,
} from "main/utils/conceptGraphUtils";

// Database-driven counterpart to LegacyHomePage.tsx, rendered at /course/{courseId}.
// All backend access goes through useBackend/useBackendMutation (React Query),
// against the concepts/*, user-state, and user-activity endpoints, so this page
// can eventually support any course, not just the one LegacyHomePage.tsx has
// baked in. LegacyHomePage.tsx itself is untouched and talks to the frozen
// /api/legacy/* endpoints via main/api/legacyClient.ts instead.

interface SavedDetailCard {
  cardType: string;
  itemLabel: string;
  conceptId: string;
  conceptColor: string;
  posX: number;
  posY: number;
}

interface EditableConcept {
  id: number;
  label: string;
  description?: string | null;
  example?: string | null;
}

interface EditableSubconcept extends EditableConcept {
  parentId?: number;
  parentLabel?: string;
  parent?: {
    id: number;
    label: string;
  };
}

type ConceptModalState =
  { mode: "create" } | { mode: "edit"; conceptId: number };
type SubConceptModalState =
  | { mode: "create"; parentConceptId: number }
  | { mode: "edit"; subConceptId: number };

const DEFAULT_NEW_CONCEPT_POSITION = { x: 0, y: 0 };

function htmlToPlainText(html?: string | null) {
  return html
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function getEditableConceptLabel(concept?: EditableConcept | MajorConceptDTO) {
  if (!concept) return "";
  return "label" in concept
    ? concept.label
    : (htmlToPlainText(concept.labelHtml) ?? "");
}

// The staff tools (debug tooltips, subconcept reordering) act on this page's
// concept graph, so their provider is mounted here — not at the app root —
// and the Footer's toggles only appear here.
export default function ConceptGraphPage() {
  const { courseId } = useParams<{ courseId: string }>();
  return (
    <StaffToolsProvider>
      {/* One mount per course: navigating between courses through the Courses
          menu keeps this route's element mounted, but everything below —
          per-course user state seeding, selections, and ScaffoldConceptGraph's
          mount-time snapshot of the graph — assumes a fresh mount per course.
          Keying by courseId enforces that; the React Query cache lives outside
          the components, so returning to a visited course is still instant. */}
      <ConceptGraphPageContent key={courseId} />
    </StaffToolsProvider>
  );
}

function ConceptGraphPageContent() {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const courseId = Number(courseIdParam);
  const courseIdIsValid =
    courseIdParam !== undefined && !Number.isNaN(courseId);

  const currentUser = useCurrentUser();
  const { registerNewConceptHandler, registerRealignConceptsHandler } =
    useStaffTools();
  // Derive the numeric id from the users table; null when not logged in.
  const userId: number | null = currentUser?.loggedIn
    ? (currentUser.root.user?.id ?? null)
    : null;

  const queryClient = useQueryClient();

  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  // Course-scoped: the backend returns [] when the course has no associated
  // PlRepo/PlInstance yet, rather than an error.
  const { data: assessments = [] } = useBackend<Assessment[]>(
    ["/api/assessments", courseId],
    { method: "GET", url: "/api/assessments", params: { courseId } },
    [],
    false,
    { enabled: courseIdIsValid },
  );

  // The course endpoint is staff-only; for students the request fails and the
  // UI simply omits staff affordances like the settings link, so the expected
  // error must not toast.
  const { data: course } = useBackend<Course | undefined>(
    ["/api/courses", courseId],
    { method: "GET", url: `/api/courses/${courseId}` },
    undefined,
    true,
    { enabled: courseIdIsValid, retry: false },
  );

  // Unlike /api/courses/{id} above (staff-only), this endpoint is available to
  // any user with access to the course (student, staff, instructor, or admin),
  // so it drives the course-identifying banner shown to everyone at the top of
  // the page.
  const { data: courseInfo } = useBackend<CourseAccess | undefined>(
    ["/api/courses/list", courseId],
    { method: "GET", url: `/api/courses/list/${courseId}` },
    undefined,
    true,
    { enabled: courseIdIsValid, retry: false },
  );

  const { data: questions = [] } = useBackend<Question[]>(
    ["/api/assessments", selectedAssessmentId, "questions"],
    {
      method: "GET",
      url: `/api/assessments/${selectedAssessmentId}/questions`,
    },
    [],
    false,
    { enabled: !!selectedAssessmentId },
  );

  const { data: questionConcepts = [] } = useBackend<QuestionConcept[]>(
    ["/api/questions", selectedQuestionId, "concepts"],
    { method: "GET", url: `/api/questions/${selectedQuestionId}/concepts` },
    [],
    false,
    { enabled: !!selectedQuestionId },
  );
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    null,
  );
  const [highlightedSubconcepts, setHighlightedSubconcepts] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [savedDetailCards, setSavedDetailCards] = useState<SavedDetailCard[]>(
    [],
  );
  const [initialDetailCards, setInitialDetailCards] = useState<
    SavedDetailCard[]
  >([]);
  const [addedDetailKeys, setAddedDetailKeys] = useState<Set<string>>(
    new Set(),
  );
  const [masteredSubconcepts, setMasteredSubconcepts] = useState<Set<string>>(
    new Set(),
  );

  // Graph data fetched from the backend for this course. These four queries
  // feed state that the user mutates locally (dragging, reordering), so window
  // focus must not silently refetch and clobber the local copy; retry is off so
  // a failure surfaces as the error screen right away, as the old fetch did.
  const graphQueryKey = ["/api/concepts/graph", courseId];
  const graphQuery = useBackend<MajorConceptDTO[]>(
    graphQueryKey,
    { method: "GET", url: "/api/concepts/graph", params: { courseId } },
    [],
    false,
    { enabled: courseIdIsValid, retry: false, refetchOnWindowFocus: false },
  );
  const contentQuery = useBackend<Record<string, ConceptContentDTO>>(
    ["/api/concepts/content", courseId],
    { method: "GET", url: "/api/concepts/content", params: { courseId } },
    {},
    false,
    { enabled: courseIdIsValid, retry: false, refetchOnWindowFocus: false },
  );
  const positionsQuery = useBackend<Record<string, PositionDTO>>(
    ["/api/concepts/positions", courseId],
    { method: "GET", url: "/api/concepts/positions", params: { courseId } },
    {},
    false,
    { enabled: courseIdIsValid, retry: false, refetchOnWindowFocus: false },
  );
  const edgesQuery = useBackend<EdgeDTO[]>(
    ["/api/concepts/edges", courseId],
    { method: "GET", url: "/api/concepts/edges", params: { courseId } },
    [],
    false,
    { enabled: courseIdIsValid, retry: false, refetchOnWindowFocus: false },
  );

  // Shared, instructor-controlled top-level positions (only POST
  // /api/course/scaffold/reset changes them).
  const positions = useMemo(
    () => positionsQuery.data ?? {},
    [positionsQuery.data],
  );
  const conceptContent = useMemo(
    () => contentQuery.data ?? {},
    [contentQuery.data],
  );
  const prereqEdgeData = useMemo(
    () => edgesQuery.data ?? [],
    [edgesQuery.data],
  );

  const graphDataError =
    graphQuery.isError ||
    contentQuery.isError ||
    positionsQuery.isError ||
    edgesQuery.isError
      ? `Failed to load concept graph data for course ${courseId}.`
      : null;
  // initialData makes these queries "successful" from the first render, so
  // gate the page on isFetched (the first real response) instead.
  const graphDataLoaded =
    graphQuery.isFetched &&
    contentQuery.isFetched &&
    positionsQuery.isFetched &&
    edgesQuery.isFetched;

  // The graph comes straight from the query cache; subconcept reordering
  // updates the cache optimistically (see handleSubconceptsReordered), and a
  // refetch (e.g. invalidation after a rejected reorder) snaps it back to the
  // authoritative order. Do NOT mirror this into useState: a mirror seeded by
  // an effect lags one render behind, and ScaffoldConceptGraph snapshots the
  // graph on mount — when all four queries resolve in one render batch, it
  // would mount against the empty pre-effect value and stay blank.
  const graphData = graphQuery.data;
  const majorConcepts = useMemo(() => graphData ?? [], [graphData]);

  // Private, per-user overrides of top-level concept positions (dragged by this
  // user); takes precedence over the shared `positions` above. Cleared
  // course-wide by an instructor's scaffold reset.
  const [topLevelPositions, setTopLevelPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [conceptModalState, setConceptModalState] =
    useState<ConceptModalState | null>(null);
  const [subConceptModalState, setSubConceptModalState] =
    useState<SubConceptModalState | null>(null);

  const userStateQuery = useBackend<UserStateResponse | undefined>(
    ["/api/user-state", userId, courseId],
    {
      method: "GET",
      url: "/api/user-state",
      params: { userid: userId, courseId },
    },
    undefined,
    false,
    {
      enabled: !!userId && courseIdIsValid,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const saveUserStateMutation = useBackendMutation<{
    userid: number;
    courseId: number;
    starred_ids: string[];
    detail_cards: unknown[];
    mastered_subconcepts: string[];
    top_level_positions: Record<string, { x: number; y: number }>;
  }>((body) => ({ method: "POST", url: "/api/user-state", data: body }), {});

  const logActivityMutation = useBackendMutation<{
    userid: number;
    courseId: number;
    event_type: string;
    payload: object;
  }>((body) => ({ method: "POST", url: "/api/user-activity", data: body }), {});

  const reorderMutation = useBackendMutation<
    { parentConceptId: number; orderedSubconceptIds: number[] },
    SubconceptDTO[]
  >(
    ({ parentConceptId, orderedSubconceptIds }) => ({
      method: "PUT",
      url: "/api/concepts/subconcepts/reorder",
      params: { parentConceptId },
      data: orderedSubconceptIds,
    }),
    {
      // If the backend rejects the reorder, refetch the graph so the local
      // order snaps back to the authoritative one (replaces the default toast;
      // the snap-back itself is the user-visible signal).
      onError: () => queryClient.invalidateQueries({ queryKey: graphQueryKey }),
    },
  );

  // "Realign Concepts" (Footer button, editing-mode only): recomputes levels,
  // colors, and layout from the edges via POST /api/course/scaffold/reset.
  const realignConceptsMutation = useBackendMutation<void>(
    () => ({
      method: "POST",
      url: "/api/course/scaffold/reset",
      params: { courseId },
    }),
    {
      onSuccess: () => {
        toast("Concepts realigned successfully.");
      },
    },
    [
      "/api/concepts/graph",
      "/api/concepts/positions",
      "/api/concepts/edges",
      "/api/concepts/content",
    ],
  );

  const conceptsPath = `/api/concepts/course?courseId=${courseId}`;
  const editableConceptsQueryKey = [conceptsPath];
  const editableSubconceptsQueryKey = ["/api/concepts/subconcepts", courseId];
  const conceptMutationInvalidations = [
    conceptsPath,
    "/api/concepts/top-level",
    "/api/concepts/subconcepts",
    "/api/concepts/graph",
    "/api/concepts/content",
  ];
  const subConceptMutationInvalidations = [
    conceptsPath,
    "/api/concepts/subconcepts",
    "/api/concepts/graph",
    "/api/concepts/content",
  ];

  const { data: editableConcepts = [] } = useBackend<EditableConcept[]>(
    editableConceptsQueryKey,
    { method: "GET", url: conceptsPath },
    [],
    true,
    { enabled: currentUser?.loggedIn && courseIdIsValid },
  );

  const { data: editableSubconcepts = [] } = useBackend<EditableSubconcept[]>(
    editableSubconceptsQueryKey,
    {
      method: "GET",
      url: "/api/concepts/subconcepts",
      params: { courseId },
    },
    [],
    true,
    { enabled: currentUser?.loggedIn && courseIdIsValid },
  );

  const masteredSubconceptsRef = useRef<Set<string>>(masteredSubconcepts);
  useEffect(() => {
    masteredSubconceptsRef.current = masteredSubconcepts;
  }, [masteredSubconcepts]);

  const starredIdsRef = useRef<Set<string>>(starredIds);
  useEffect(() => {
    starredIdsRef.current = starredIds;
  }, [starredIds]);

  const savedDetailCardsRef = useRef<SavedDetailCard[]>(savedDetailCards);
  useEffect(() => {
    savedDetailCardsRef.current = savedDetailCards;
  }, [savedDetailCards]);

  const topLevelPositionsRef =
    useRef<Record<string, { x: number; y: number }>>(topLevelPositions);
  useEffect(() => {
    topLevelPositionsRef.current = topLevelPositions;
  }, [topLevelPositions]);

  const { mutate: logActivityMutate } = logActivityMutation;
  const logActivity = useCallback(
    (eventType: string, payload: object) => {
      if (!userId || !courseIdIsValid) return;
      logActivityMutate({
        userid: userId,
        courseId,
        event_type: eventType,
        payload,
      });
    },
    [userId, courseId, courseIdIsValid, logActivityMutate],
  );

  const openCreateConceptModal = useCallback(
    () => setConceptModalState({ mode: "create" }),
    [],
  );

  useEffect(() => {
    if (!currentUser?.loggedIn || !courseIdIsValid) {
      registerNewConceptHandler(null);
      return;
    }
    registerNewConceptHandler(openCreateConceptModal);
    return () => registerNewConceptHandler(null);
  }, [
    currentUser?.loggedIn,
    courseIdIsValid,
    openCreateConceptModal,
    registerNewConceptHandler,
  ]);

  const { mutate: realignConceptsMutate } = realignConceptsMutation;
  const realignConcepts = useCallback(() => {
    realignConceptsMutate();
  }, [realignConceptsMutate]);

  useEffect(() => {
    if (!currentUser?.loggedIn || !courseIdIsValid) {
      registerRealignConceptsHandler(null);
      return;
    }
    registerRealignConceptsHandler(realignConcepts);
    return () => registerRealignConceptsHandler(null);
  }, [
    currentUser?.loggedIn,
    courseIdIsValid,
    realignConcepts,
    registerRealignConceptsHandler,
  ]);

  // Log the login once per visit, as soon as we know who the user is.
  const loginLoggedRef = useRef(false);
  useEffect(() => {
    if (!userId || !courseIdIsValid || loginLoggedRef.current) return;
    loginLoggedRef.current = true;
    logActivity("login", { consented: true });
  }, [userId, courseIdIsValid, logActivity]);

  // Seed the locally-mutated state from the user's saved state exactly once;
  // later query refetches must not clobber unsaved local changes.
  const userStateSeededRef = useRef(false);
  const savedUserState = userStateQuery.data;
  useEffect(() => {
    if (!savedUserState || userStateSeededRef.current) return;
    userStateSeededRef.current = true;
    setStarredIds(new Set(savedUserState.starred_ids as string[]));
    const cards = (savedUserState.detail_cards as SavedDetailCard[]) ?? [];
    setSavedDetailCards(cards);
    setAddedDetailKeys(
      new Set(cards.map((c) => `${c.cardType}:${c.itemLabel}`)),
    );
    setInitialDetailCards(cards);
    setMasteredSubconcepts(
      new Set((savedUserState.mastered_subconcepts ?? []) as string[]),
    );
    setTopLevelPositions(savedUserState.top_level_positions ?? {});
  }, [savedUserState]);

  const { mutate: saveUserStateMutate } = saveUserStateMutation;
  const persistState = useCallback(
    (
      stars: Set<string>,
      cards: SavedDetailCard[],
      mastered: Set<string> = masteredSubconceptsRef.current,
      topLevelPos: Record<
        string,
        { x: number; y: number }
      > = topLevelPositionsRef.current,
    ) => {
      if (!userId || !courseIdIsValid) return;
      const starredIdsArray = Array.from(stars);
      const masteredArray = Array.from(mastered);
      saveUserStateMutate({
        userid: userId,
        courseId,
        starred_ids: starredIdsArray,
        detail_cards: cards,
        mastered_subconcepts: masteredArray,
        top_level_positions: topLevelPos,
      });
      // Mirror the save into the cached user state, so that remounting this
      // course (switching away and back) seeds from the state the user last
      // saw — the cache otherwise still holds the snapshot fetched when the
      // course was first opened, and the once-per-mount seed would restore it.
      queryClient.setQueryData<UserStateResponse>(
        ["/api/user-state", userId, courseId],
        {
          starred_ids: starredIdsArray,
          detail_cards: cards,
          mastered_subconcepts: masteredArray,
          top_level_positions: topLevelPos,
        },
      );
    },
    [userId, courseId, courseIdIsValid, saveUserStateMutate, queryClient],
  );

  // Private overrides take precedence over the shared, instructor-controlled positions.
  const effectivePositions = useMemo(
    () => ({ ...positions, ...topLevelPositions }),
    [positions, topLevelPositions],
  );

  const handleMajorMoved = (name: string, posX: number, posY: number) => {
    setTopLevelPositions((prev) => {
      const next = { ...prev, [name]: { x: posX, y: posY } };
      persistState(
        starredIdsRef.current,
        savedDetailCardsRef.current,
        masteredSubconceptsRef.current,
        next,
      );
      return next;
    });
  };

  const handleSubconceptMastered = (sub: string) => {
    setMasteredSubconcepts((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) {
        next.delete(sub);
      } else {
        next.add(sub);
      }
      persistState(starredIdsRef.current, savedDetailCardsRef.current, next);
      return next;
    });
  };

  // An author (with editing enabled) drag-and-dropped a card's
  // subconcepts. ScaffoldConceptGraph already updated its own nodes; mirror the
  // new order into the cached graph data (so anything rebuilt from it agrees)
  // and persist it via the reorder mutation, whose onError refetches so the
  // order snaps back to the authoritative one.
  const handleSubconceptsReordered = (
    parentConceptId: number,
    orderedSubconceptIds: number[],
  ) => {
    queryClient.setQueryData<MajorConceptDTO[]>(graphQueryKey, (prev) =>
      prev?.map((concept) =>
        concept.id === parentConceptId
          ? {
              ...concept,
              subconcepts: orderedSubconceptIds
                .map((subId) =>
                  concept.subconcepts.find((sub) => sub.id === subId),
                )
                .filter((sub): sub is SubconceptDTO => sub !== undefined),
            }
          : concept,
      ),
    );
    reorderMutation.mutate({ parentConceptId, orderedSubconceptIds });
  };

  const conceptModalInitialContents = useMemo(() => {
    if (!conceptModalState || conceptModalState.mode === "create")
      return undefined;

    const editableConcept = editableConcepts.find(
      (concept) => concept.id === conceptModalState.conceptId,
    );
    if (editableConcept) return editableConcept;

    const fallbackConcept = majorConcepts.find(
      (concept) => concept.id === conceptModalState.conceptId,
    );
    const fallbackContent = conceptContent[String(conceptModalState.conceptId)];
    return {
      label: htmlToPlainText(fallbackConcept?.labelHtml) ?? "",
      description: htmlToPlainText(fallbackContent?.descriptionHtml) ?? "",
      example: htmlToPlainText(fallbackContent?.exampleHtml) ?? "",
    };
  }, [conceptModalState, editableConcepts, majorConcepts, conceptContent]);

  const subConceptModalInitialContents = useMemo(() => {
    if (!subConceptModalState) return undefined;

    if (subConceptModalState.mode === "create") {
      const parentConcept =
        editableConcepts.find(
          (concept) => concept.id === subConceptModalState.parentConceptId,
        ) ??
        majorConcepts.find(
          (concept) => concept.id === subConceptModalState.parentConceptId,
        );

      return {
        parentId: subConceptModalState.parentConceptId,
        parentLabel: getEditableConceptLabel(parentConcept),
      };
    }

    const editableSubconcept = editableSubconcepts.find(
      (subconcept) => subconcept.id === subConceptModalState.subConceptId,
    );
    if (editableSubconcept) {
      return {
        ...editableSubconcept,
        parentId:
          editableSubconcept.parentId ?? editableSubconcept.parent?.id ?? "",
        parentLabel:
          editableSubconcept.parentLabel ??
          editableSubconcept.parent?.label ??
          "",
      };
    }

    const fallbackParent = majorConcepts.find((concept) =>
      concept.subconcepts.some(
        (subconcept) => subconcept.id === subConceptModalState.subConceptId,
      ),
    );
    const fallbackSubconcept = fallbackParent?.subconcepts.find(
      (subconcept) => subconcept.id === subConceptModalState.subConceptId,
    );
    const fallbackContent =
      conceptContent[String(subConceptModalState.subConceptId)];
    return {
      parentId: fallbackParent?.id ?? "",
      parentLabel: htmlToPlainText(fallbackParent?.labelHtml) ?? "",
      label: htmlToPlainText(fallbackSubconcept?.labelHtml) ?? "",
      description: htmlToPlainText(fallbackContent?.descriptionHtml) ?? "",
      example: htmlToPlainText(fallbackContent?.exampleHtml) ?? "",
    };
  }, [
    subConceptModalState,
    editableConcepts,
    editableSubconcepts,
    majorConcepts,
    conceptContent,
  ]);

  const createConceptMutation = useBackendMutation(
    (concept: EditableConcept) => ({
      url: "/api/concept",
      method: "POST",
      data: {
        courseId,
        label: concept.label,
        description: concept.description,
        example: concept.example,
        ...DEFAULT_NEW_CONCEPT_POSITION,
      },
    }),
    {
      onSuccess: async (concept: EditableConcept) => {
        toast(`Concept ${concept.label} created`);
        setConceptModalState(null);
      },
    },
    conceptMutationInvalidations,
  );

  const updateConceptMutation = useBackendMutation(
    (concept: EditableConcept) => ({
      url: `/api/concept/put?conceptId=${
        conceptModalState?.mode === "edit" ? conceptModalState.conceptId : ""
      }`,
      method: "PUT",
      data: {
        label: concept.label,
        description: concept.description,
        example: concept.example,
      },
    }),
    {
      onSuccess: async (concept: EditableConcept) => {
        toast(`Concept ${concept.label} updated`);
        setConceptModalState(null);
      },
    },
    conceptMutationInvalidations,
  );

  const createSubconceptMutation = useBackendMutation(
    (subconcept: EditableSubconcept) => ({
      url: "/api/concept/subconcept",
      method: "POST",
      data: {
        courseId,
        parentConceptId: Number(subconcept.parentId),
        label: subconcept.label,
        description: subconcept.description,
        example: subconcept.example,
      },
    }),
    {
      onSuccess: async (subconcept: EditableSubconcept) => {
        toast(`SubConcept ${subconcept.label} created`);
        setSubConceptModalState(null);
      },
    },
    subConceptMutationInvalidations,
  );

  const updateSubconceptMutation = useBackendMutation(
    (subconcept: EditableSubconcept) => ({
      url: `/api/concept/subconcept/put?conceptId=${
        subConceptModalState?.mode === "edit"
          ? subConceptModalState.subConceptId
          : ""
      }`,
      method: "PUT",
      data: {
        label: subconcept.label,
        description: subconcept.description,
        example: subconcept.example,
      },
    }),
    {
      onSuccess: async (subconcept: EditableSubconcept) => {
        toast(`SubConcept ${subconcept.label} updated`);
        setSubConceptModalState(null);
      },
    },
    subConceptMutationInvalidations,
  );

  const handlePaneClick = () => {
    if (!selectedQuestionId) {
      setSelectedConceptId(null);
      setSelectedItem(null);
      setHighlightedIds(new Set());
    }
  };

  // Selecting a different assessment clears the question selection and any
  // question-driven highlighting; the questions query above refetches on its
  // own because its key includes selectedAssessmentId.
  useEffect(() => {
    if (!selectedAssessmentId) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedQuestionId("");
    setHighlightedIds(new Set());
    setSelectedConceptId(null);
    setHighlightedSubconcepts(new Map());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedAssessmentId]);

  useEffect(() => {
    if (!selectedQuestionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedConceptId(null);
    logActivity("question_viewed", { questionId: selectedQuestionId });
  }, [logActivity, selectedQuestionId]);

  // Recompute the question-driven highlighting whenever the question's
  // concepts arrive or the edges finish loading, so a question selected before
  // that point still gets its full prerequisite chain highlighted rather than
  // only the tagged concepts.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!selectedQuestionId) {
      setHighlightedIds(new Set());
      setHighlightedSubconcepts(new Map());
      return;
    }
    setHighlightedIds(
      computeScaffoldSubgraph(
        questionConcepts.map((c) => c.concept_id),
        prereqEdgeData,
      ),
    );
    const subMap = new Map<string, Set<string>>();
    questionConcepts.forEach((c) => {
      if (c.subconcept_label) {
        if (!subMap.has(c.concept_id)) subMap.set(c.concept_id, new Set());
        subMap.get(c.concept_id)!.add(normalize(c.subconcept_label));
      }
    });
    setHighlightedSubconcepts(subMap);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedQuestionId, questionConcepts, prereqEdgeData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedItem(null);
  }, [selectedConceptId]);

  useEffect(() => {
    if (!selectedItem || !selectedConceptId) return;
    logActivity("detail_visited", {
      conceptId: selectedConceptId,
      itemLabel: selectedItem,
    });
  }, [logActivity, selectedConceptId, selectedItem]);

  const selectedConcept = selectedConceptId
    ? majorConcepts.find((c) => String(c.id) === selectedConceptId)
    : null;

  const handleConceptClick = (id: string) => {
    setSelectedConceptId(id);
    if (!selectedQuestionId) {
      setHighlightedIds(computeScaffoldSubgraph([id], prereqEdgeData));
    }
    logActivity("concept_clicked", { conceptId: id });
  };

  const handleStarClick = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persistState(next, savedDetailCardsRef.current);
      return next;
    });
  };

  const handleReset = () => {
    setStarredIds(new Set());
    setHighlightedIds(new Set());
    setHighlightedSubconcepts(new Map());
    setSelectedConceptId(null);
    setSelectedItem(null);
    setSelectedQuestionId("");
    setSavedDetailCards([]);
    setAddedDetailKeys(new Set());
    setMasteredSubconcepts(new Set());
    setTopLevelPositions({});
    persistState(new Set(), [], new Set(), {});
  };

  const handleDetailAdded = (card: SavedDetailCard) => {
    const key = `${card.cardType}:${card.itemLabel}`;
    setAddedDetailKeys((prev) => new Set([...prev, key]));
    setSavedDetailCards((prev) => {
      const next = [...prev, card];
      persistState(starredIdsRef.current, next);
      return next;
    });
    logActivity("detail_added_to_graph", {
      cardType: card.cardType,
      itemLabel: card.itemLabel,
      conceptId: card.conceptId,
    });
  };

  const handleDetailDeleted = (cardType: string, itemLabel: string) => {
    const key = `${cardType}:${itemLabel}`;
    setAddedDetailKeys((prev) => {
      const s = new Set(prev);
      s.delete(key);
      return s;
    });
    setSavedDetailCards((prev) => {
      const next = prev.filter(
        (c) => !(c.cardType === cardType && c.itemLabel === itemLabel),
      );
      persistState(starredIdsRef.current, next);
      return next;
    });
  };

  const handleDetailMoved = (
    cardType: string,
    itemLabel: string,
    posX: number,
    posY: number,
  ) => {
    setSavedDetailCards((prev) => {
      const next = prev.map((c) =>
        c.cardType === cardType && c.itemLabel === itemLabel
          ? { ...c, posX, posY }
          : c,
      );
      persistState(starredIdsRef.current, next);
      return next;
    });
  };

  const handleConceptDoubleClick = (conceptId: string) => {
    setConceptModalState({ mode: "edit", conceptId: Number(conceptId) });
  };

  const handleSubconceptDoubleClick = (
    _parentConceptId: string,
    subconceptId: string,
  ) => {
    setSubConceptModalState({
      mode: "edit",
      subConceptId: Number(subconceptId),
    });
  };

  const handleAddSubconcept = (parentConceptId: string) => {
    setSubConceptModalState({
      mode: "create",
      parentConceptId: Number(parentConceptId),
    });
  };

  if (!currentUser?.loggedIn) {
    return (
      <BasicLayout>
        <LoginScreen />
      </BasicLayout>
    );
  }

  if (!courseIdIsValid) {
    return (
      <BasicLayout>
        <div style={{ padding: 20 }}>Invalid course id.</div>
      </BasicLayout>
    );
  }

  if (graphDataError) {
    return (
      <BasicLayout>
        <div style={{ padding: 20 }}>{graphDataError}</div>
      </BasicLayout>
    );
  }

  if (!graphDataLoaded) {
    return (
      <BasicLayout>
        <div
          data-testid="concept-graph-page-loading"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            minHeight: "50vh",
          }}
        >
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </BasicLayout>
    );
  }

  return (
    <BasicLayout lockScroll>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          flex: 1,
          minHeight: 0,
          color: "#f7ede1",
        }}
      >
        {/* ── Top bar ── */}
        <ScaffoldTopBar
          course={course}
          courseInfo={courseInfo}
          courseId={courseId}
          assessments={assessments}
          selectedAssessmentId={selectedAssessmentId}
          onSelectAssessment={(id) => {
            setSelectedAssessmentId(id);
            setSelectedQuestionId("");
          }}
          questions={questions}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={setSelectedQuestionId}
          numStarredConcepts={starredIds.size}
          numTotalConcepts={majorConcepts.length}
        />

        {/* ── Graph ── */}
        <div style={{ flex: 1, minHeight: 0, background: "#ffffff" }}>
          <ScaffoldConceptGraph
            majorConcepts={majorConcepts}
            positions={effectivePositions}
            conceptContent={conceptContent}
            prereqEdgeData={prereqEdgeData}
            highlightedIds={highlightedIds}
            highlightedSubconcepts={highlightedSubconcepts}
            onConceptClick={handleConceptClick}
            starredIds={starredIds}
            onStarClick={handleStarClick}
            onReset={handleReset}
            restoredDetailCards={initialDetailCards}
            onDetailAdded={handleDetailAdded}
            onDetailDeleted={handleDetailDeleted}
            onDetailMoved={handleDetailMoved}
            onMajorMoved={handleMajorMoved}
            masteredSubconcepts={masteredSubconcepts}
            onSubconceptMastered={handleSubconceptMastered}
            onSubconceptsReordered={handleSubconceptsReordered}
            onConceptDoubleClick={handleConceptDoubleClick}
            onSubconceptDoubleClick={handleSubconceptDoubleClick}
            onAddSubconcept={handleAddSubconcept}
            onPaneClick={handlePaneClick}
          />
        </div>
        <ConceptModal
          showModal={conceptModalState !== null}
          toggleShowModal={(show: boolean) => {
            if (!show) setConceptModalState(null);
          }}
          initialContents={conceptModalInitialContents}
          onSubmitAction={(concept: EditableConcept) =>
            conceptModalState?.mode === "edit"
              ? updateConceptMutation.mutate(concept)
              : createConceptMutation.mutate(concept)
          }
          buttonText={conceptModalState?.mode === "edit" ? "Update" : "Create"}
          modalTitle={
            conceptModalState?.mode === "edit"
              ? "Edit Concept"
              : "Create Concept"
          }
        />
        <SubConceptModal
          showModal={subConceptModalState !== null}
          toggleShowModal={(show: boolean) => {
            if (!show) setSubConceptModalState(null);
          }}
          initialContents={subConceptModalInitialContents}
          onSubmitAction={(subconcept: EditableSubconcept) =>
            subConceptModalState?.mode === "edit"
              ? updateSubconceptMutation.mutate(subconcept)
              : createSubconceptMutation.mutate(subconcept)
          }
          buttonText={
            subConceptModalState?.mode === "edit" ? "Update" : "Create"
          }
          modalTitle={
            subConceptModalState?.mode === "edit"
              ? "Edit SubConcept"
              : "Create SubConcept"
          }
        />

        {/* ── Bottom toolbar ── */}
        <div
          style={{
            position: "relative",
            zIndex: 20,
            flexShrink: 0,
            background: "#f4e87b",
          }}
        >
          {/* Main toolbar row */}
          <div
            style={{
              padding: "12px 20px 6px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 60,
            }}
          >
            {selectedConcept ? (
              <>
                {/* Main concept button */}
                <button
                  onClick={() =>
                    setSelectedItem(
                      selectedItem === String(selectedConcept.id)
                        ? null
                        : String(selectedConcept.id),
                    )
                  }
                  style={{
                    background:
                      selectedItem === String(selectedConcept.id)
                        ? selectedConcept.color
                        : "#ffffff",
                    color: "#000000",
                    borderTop: "1.5px solid #1E293B",
                    borderLeft: "1.5px solid #1E293B",
                    borderRight: "4px solid #1E293B",
                    borderBottom: "4px solid #1E293B",
                    borderRadius: 6,
                    padding: "5px 14px",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "Helvetica, Arial, sans-serif",
                    cursor: "pointer",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: selectedConcept.labelHtml.replace(/\n/g, " "),
                    }}
                  />
                </button>

                {/* Divider */}
                <div
                  style={{
                    width: 1,
                    alignSelf: "stretch",
                    background: "#00000033",
                    flexShrink: 0,
                  }}
                />

                {/* Subconcept buttons */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  {selectedConcept.subconcepts.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() =>
                        setSelectedItem(
                          selectedItem === sub.labelHtml ? null : sub.labelHtml,
                        )
                      }
                      style={{
                        background:
                          selectedItem === sub.labelHtml
                            ? selectedConcept.color
                            : "#ffffff",
                        color: "#000000",
                        border: "1px solid #000000",
                        borderRadius: 6,
                        padding: "5px 14px",
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: "Helvetica, Arial, sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: sub.labelHtml.replace(/\n/g, " "),
                        }}
                      />
                    </button>
                  ))}
                </div>

                {/* Close button */}
                <div
                  className="homepage-toolbar-close"
                  onClick={() => {
                    setSelectedConceptId(null);
                    setSelectedItem(null);
                    if (!selectedQuestionId) setHighlightedIds(new Set());
                  }}
                >
                  <svg
                    className="homepage-toolbar-close-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </>
            ) : (
              <div
                style={{ color: "#000000", fontSize: 13, lineHeight: "36px" }}
              >
                {selectedQuestionId
                  ? "Click a concept card to explore it."
                  : "Select a question, or click any concept card to explore it."}
              </div>
            )}
          </div>

          {/* Expanded cards — only shown when a button is clicked */}
          {selectedConcept &&
            selectedItem !== null &&
            (() => {
              // selectedItem holds a subconcept's labelHtml, or the major
              // concept's node id (its numeric id as a string). Content is
              // keyed by each concept's own numeric id.
              const isMajorConcept =
                selectedItem === String(selectedConcept.id);
              const selectedItemLabel = isMajorConcept
                ? selectedConcept.labelHtml.replace(/\n/g, " ")
                : (selectedItem ?? "");
              const subconceptId = selectedConcept.subconcepts.find(
                (s) => s.labelHtml === selectedItem,
              )?.id;
              const contentKey = isMajorConcept
                ? String(selectedConcept.id)
                : String(subconceptId);
              const content = conceptContent[contentKey];

              return (
                <div
                  style={{ padding: "0 20px 20px", display: "flex", gap: 12 }}
                >
                  {(
                    [
                      { label: "Description", key: "descriptionHtml" },
                      { label: "Example", key: "exampleHtml" },
                    ] as {
                      label: string;
                      key: "descriptionHtml" | "exampleHtml";
                    }[]
                  ).map((card) => {
                    const isAdded = addedDetailKeys.has(
                      `${card.label}:${selectedItemLabel}`,
                    );
                    return (
                      <div
                        key={card.key}
                        draggable={!isAdded}
                        onDragStart={
                          isAdded
                            ? undefined
                            : (e) => {
                                e.dataTransfer.setData(
                                  "application/scaffold-card",
                                  JSON.stringify({
                                    cardType: card.label,
                                    itemLabel: selectedItemLabel,
                                    conceptId: String(selectedConcept.id),
                                    conceptColor: selectedConcept.color,
                                    cardContent: content?.[card.key] ?? "",
                                  }),
                                );
                                e.dataTransfer.effectAllowed = "move";
                              }
                        }
                        style={{
                          flex: 1,
                          background: toPastel(selectedConcept.color),
                          borderRadius: 8,
                          border: "1px solid #000000",
                          padding: "10px 14px",
                          textAlign: "left",
                          cursor: isAdded ? "default" : "grab",
                          opacity: isAdded ? 0.8 : 1,
                        }}
                      >
                        <span
                          style={{
                            background: selectedConcept.color,
                            borderRadius: 100,
                            padding: "2px 10px",
                            border: "1px solid #000000",
                            fontFamily: "Helvetica, Arial, sans-serif",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#000000",
                            whiteSpace: "nowrap",
                            width: "fit-content",
                            display: "block",
                            marginBottom: 8,
                          }}
                        >
                          {card.label}
                        </span>
                        <div
                          style={{
                            fontFamily: "Helvetica, Arial, sans-serif",
                            fontSize: 15,
                            color: "#1E293B",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {card.key === "exampleHtml" ? (
                            <div
                              className="concept-detail-content"
                              style={{
                                fontFamily: "monospace",
                                border: "1px solid #000000",
                                fontSize: 13,
                                background: "#e2e8f0",
                                borderRadius: 6,
                                padding: "8px 12px",
                                margin: 0,
                                whiteSpace: "pre-wrap",
                                color: "#1E293B",
                              }}
                              dangerouslySetInnerHTML={{
                                __html:
                                  content?.[card.key] ??
                                  `Example for "${selectedItemLabel}" will appear here.`,
                              }}
                            />
                          ) : (
                            <div
                              className="concept-detail-content"
                              dangerouslySetInnerHTML={{
                                __html:
                                  content?.[card.key] ??
                                  `${card.label} for "${selectedItemLabel}" will appear here.`,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isMajorConcept && (
                    <a
                      href={content?.practiceUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: "0 0 auto",
                        alignSelf: "center",
                        background: selectedConcept.color,
                        borderRadius: 8,
                        borderTop: "1.5px solid #1E293B",
                        borderLeft: "1.5px solid #1E293B",
                        borderRight: "4px solid #1E293B",
                        borderBottom: "4px solid #1E293B",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#1E293B",
                        cursor: content?.practiceUrl ? "pointer" : "default",
                        textDecoration: "none",
                        padding: "10px 14px",
                        opacity: content?.practiceUrl ? 1 : 0.4,
                      }}
                    >
                      Practice with a <br />
                      PrairieLearn <br /> question
                    </a>
                  )}
                </div>
              );
            })()}
        </div>
      </div>
    </BasicLayout>
  );
}
