import { useState, useEffect, useRef, useCallback } from "react";
import LegacyConceptGraph from "main/components/LegacyHomePage/LegacyConceptGraph";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";

import {
  fetchAssessments,
  fetchQuestions,
  fetchQuestionConcepts,
  fetchLegacyUserState,
  logLegacyUserActivity,
  saveLegacyUserState,
} from "main/api/legacyClient";
import type { Assessment, Question } from "main/api/legacyClient";
import { majorConcepts } from "main/data/conceptGraph";
import LegacyQuestionSearch from "main/components/LegacyHomePage/LegacyQuestionSearch";
import LegacyAssessmentSelect from "main/components/LegacyHomePage/LegacyAssessmentSelect";
import { conceptContent, type ConceptContent } from "main/data/conceptContent";
import { useCurrentUser } from "main/utils/currentUser";
import { StaffToolsProvider } from "main/utils/staffTools";
import {
  normalize,
  toPastel,
  computeLegacySubgraph,
} from "main/utils/conceptGraphUtils";

interface SavedDetailCard {
  cardType: string;
  itemLabel: string;
  conceptId: string;
  conceptColor: string;
  posX: number;
  posY: number;
}

// The staff tools (debug tooltips) act on this page's concept graph, so their
// provider is mounted here rather than at the app root.
export default function LegacyHomePage() {
  return (
    <StaffToolsProvider>
      <LegacyHomePageContent />
    </StaffToolsProvider>
  );
}

function LegacyHomePageContent() {
  const currentUser = useCurrentUser();
  // Derive the numeric id from the users table; null when not logged in.
  const userId: number | null = currentUser?.loggedIn
    ? (currentUser.root.user?.id ?? null)
    : null;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
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

  // Load the user's saved state once on login.
  const userStateLoadedRef = useRef(false);
  useEffect(() => {
    if (!userId || userStateLoadedRef.current) return;
    userStateLoadedRef.current = true;

    logLegacyUserActivity({
      userid: userId,
      event_type: "login",
      payload: { consented: true },
    });

    fetchLegacyUserState(userId).then((data) => {
      if (data) {
        setStarredIds(new Set(data.starred_ids as string[]));
        const cards = (data.detail_cards as SavedDetailCard[]) ?? [];
        setSavedDetailCards(cards);
        setAddedDetailKeys(
          new Set(cards.map((c) => `${c.cardType}:${c.itemLabel}`)),
        );
        setInitialDetailCards(cards);
        setMasteredSubconcepts(
          new Set((data.mastered_subconcepts ?? []) as string[]),
        );
      }
    });
  }, [userId]);

  const persistState = useCallback(
    async (
      stars: Set<string>,
      cards: SavedDetailCard[],
      mastered: Set<string> = masteredSubconceptsRef.current,
    ) => {
      if (!userId) return;
      await saveLegacyUserState({
        userid: userId,
        starred_ids: Array.from(stars),
        detail_cards: cards,
        mastered_subconcepts: Array.from(mastered),
      });
    },
    [userId],
  );

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

  const logActivity = useCallback(
    async (eventType: string, payload: object) => {
      if (!userId) return;
      await logLegacyUserActivity({
        userid: userId,
        event_type: eventType,
        payload,
      });
    },
    [userId],
  );

  const handlePaneClick = () => {
    if (!selectedQuestionId) {
      setSelectedConceptId(null);
      setSelectedItem(null);
      setHighlightedIds(new Set());
    }
  };

  useEffect(() => {
    fetchAssessments().then(setAssessments);
  }, []);

  useEffect(() => {
    if (!selectedAssessmentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestions([]);
      return;
    }
    setQuestions([]);
    fetchQuestions(selectedAssessmentId).then(setQuestions);
    setSelectedQuestionId("");
    setHighlightedIds(new Set());
    setSelectedConceptId(null);
    setHighlightedSubconcepts(new Map());
  }, [selectedAssessmentId]);

  useEffect(() => {
    if (!selectedQuestionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIds(new Set());

      setHighlightedSubconcepts(new Map());
      return;
    }
    fetchQuestionConcepts(selectedQuestionId).then((concepts) => {
      setHighlightedIds(
        computeLegacySubgraph(concepts.map((c) => c.concept_id)),
      );
      const subMap = new Map<string, Set<string>>();
      concepts.forEach((c) => {
        if (c.subconcept_label) {
          if (!subMap.has(c.concept_id)) subMap.set(c.concept_id, new Set());
          subMap.get(c.concept_id)!.add(normalize(c.subconcept_label));
        }
      });
      setHighlightedSubconcepts(subMap);
    });
    setSelectedConceptId(null);
    logActivity("question_viewed", { questionId: selectedQuestionId });
  }, [logActivity, selectedQuestionId]);

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
    ? majorConcepts.find((c) => c.name === selectedConceptId)
    : null;

  const handleConceptClick = (id: string) => {
    setSelectedConceptId(id);
    if (!selectedQuestionId) {
      setHighlightedIds(computeLegacySubgraph([id]));
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
    persistState(new Set(), [], new Set());
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
        <div
          style={{
            height: 60,
            flexShrink: 0,
            background: "#f4e87b",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 20px",
          }}
        >
          <div
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 800,
              fontSize: 20,
              color: "#1E293B",
              background: "#d9f9ff",
              padding: "4px 12px",
              borderRadius: 8,
              borderTop: "1.5px solid #1E293B",
              borderLeft: "1.5px solid #1E293B",
              borderRight: "4px solid #1E293B",
              borderBottom: "4px solid #1E293B",
            }}
          >
            Scaffold
          </div>
          <LegacyAssessmentSelect
            assessments={assessments}
            selectedAssessmentId={selectedAssessmentId}
            onSelect={(id) => {
              setSelectedAssessmentId(id);
              setSelectedQuestionId("");
            }}
          />
          <div style={{ flex: 1, maxWidth: 300 }}>
            <LegacyQuestionSearch
              questions={questions}
              selectedQuestionId={selectedQuestionId}
              onSelect={setSelectedQuestionId}
              disabled={!selectedAssessmentId || questions.length === 0}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
              paddingRight: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderTop: "1.5px solid #1E293B",
                borderLeft: "1.5px solid #1E293B",
                borderRight: "4px solid #1E293B",
                borderBottom: "4px solid #1E293B",
                background: "#FACC15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#1E293B"
                stroke="#1E293B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                fontSize: "clamp(11px, 2vw, 16px)",
                fontWeight: 700,
                color: "#1E293B",
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
              }}
            >
              {starredIds.size} / 26
            </span>
          </div>
        </div>

        {/* ── Graph ── */}
        <div style={{ flex: 1, minHeight: 0, background: "#ffffff" }}>
          <LegacyConceptGraph
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
            masteredSubconcepts={masteredSubconcepts}
            onSubconceptMastered={handleSubconceptMastered}
            onPaneClick={handlePaneClick}
          />
        </div>

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
                      selectedItem === selectedConcept.name
                        ? null
                        : selectedConcept.name,
                    )
                  }
                  style={{
                    background:
                      selectedItem === selectedConcept.name
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
                  {selectedConcept.label.replace(/\n/g, " ")}
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
                      key={sub}
                      onClick={() =>
                        setSelectedItem(selectedItem === sub ? null : sub)
                      }
                      style={{
                        background:
                          selectedItem === sub
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
                      {sub.replace(/\n/g, " ")}
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
              const selectedItemLabel =
                selectedItem === selectedConcept.name
                  ? selectedConcept.label.replace(/\n/g, " ")
                  : (selectedItem ?? "");
              const contentKey =
                selectedItem === selectedConcept.name
                  ? selectedConcept.name
                  : `${selectedConcept.name}:${selectedItem}`;
              const content = conceptContent[contentKey];
              const isMajorConcept = selectedItem === selectedConcept.name;

              return (
                <div
                  style={{ padding: "0 20px 20px", display: "flex", gap: 12 }}
                >
                  {[
                    { label: "Description", key: "description" },
                    { label: "Example", key: "example" },
                  ].map((card) => {
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
                                    conceptId: selectedConcept.name,
                                    conceptColor: selectedConcept.color,
                                    cardContent:
                                      content?.[
                                        card.key as keyof ConceptContent
                                      ] ?? "",
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
                          {card.key === "example" ? (
                            <pre
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
                            >
                              {content?.[card.key as keyof ConceptContent] ??
                                `Example for "${selectedItemLabel}" will appear here.`}
                            </pre>
                          ) : (
                            (content?.[card.key as keyof ConceptContent] ??
                            `${card.label} for "${selectedItemLabel}" will appear here.`)
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
