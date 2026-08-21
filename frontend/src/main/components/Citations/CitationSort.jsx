import { useState } from "react";
import { Button, Collapse } from "react-bootstrap";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CITATION_SORT_OPTIONS,
  DEFAULT_CITATION_SORT,
  SELECTED_CONTAINER_ID,
  AVAILABLE_CONTAINER_ID,
  addCriterion,
  removeCriterion,
  moveCriterion,
  reorderAfterDrag,
} from "main/utils/citationSort";

// A droppable+sortable container: useDroppable lets a criterion be dropped into this list even
// when it's empty (an empty list has no item of its own to be dropped "onto"); the enclosing
// SortableContext is what actually makes the items inside reorderable.
function DroppableList({ id, items, testId, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <ul
      ref={setNodeRef}
      className="list-unstyled border rounded-3 p-2 bg-light mb-0"
      style={{ minHeight: "3rem" }}
      data-testid={testId}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </ul>
  );
}

function SelectedItem({ criterion, index, total, testId, onRemove, onMove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: criterion });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="d-flex align-items-center justify-content-between border rounded-2 p-2 mb-1 bg-white"
      data-testid={`${testId}-selected-item-${criterion}`}
    >
      <span className="d-flex align-items-center">
        <span
          {...attributes}
          {...listeners}
          className="me-2"
          style={{ cursor: "grab" }}
          data-testid={`${testId}-selected-item-${criterion}-handle`}
        >
          ⠿
        </span>
        {index + 1}. {criterion}
      </span>
      <span>
        <Button
          size="sm"
          variant="outline-secondary"
          className="me-1"
          disabled={index === 0}
          aria-label={`Move ${criterion} up`}
          data-testid={`${testId}-selected-item-${criterion}-up`}
          onClick={() => onMove(criterion, -1)}
        >
          ↑
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          className="me-1"
          disabled={index === total - 1}
          aria-label={`Move ${criterion} down`}
          data-testid={`${testId}-selected-item-${criterion}-down`}
          onClick={() => onMove(criterion, 1)}
        >
          ↓
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          aria-label={`Remove ${criterion}`}
          data-testid={`${testId}-selected-item-${criterion}-remove`}
          onClick={() => onRemove(criterion)}
        >
          &times;
        </Button>
      </span>
    </li>
  );
}

function AvailableItem({ criterion, testId, onAdd }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: criterion });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="d-flex align-items-center justify-content-between border rounded-2 p-2 mb-1 bg-white"
      data-testid={`${testId}-available-item-${criterion}`}
    >
      <span className="d-flex align-items-center">
        <span
          {...attributes}
          {...listeners}
          className="me-2"
          style={{ cursor: "grab" }}
          data-testid={`${testId}-available-item-${criterion}-handle`}
        >
          ⠿
        </span>
        {criterion}
      </span>
      <Button
        size="sm"
        variant="outline-primary"
        aria-label={`Add ${criterion}`}
        data-testid={`${testId}-available-item-${criterion}-add`}
        onClick={() => onAdd(criterion)}
      >
        Add &gt;
      </Button>
    </li>
  );
}

// A controlled sort-criteria panel for a list of BibTexEntry citations (issue #102), intended to
// sit alongside CitationFilter above the Citations tab's table / the References/Citations
// tables. Like CitationFilter, this only renders the sort-criteria UI and reports the selected
// (ordered) criteria via onChange — it does not sort anything itself. Whatever page renders it
// owns the `sortCriteria` value (typically starting from DEFAULT_CITATION_SORT) and is
// responsible for applying that ordered list of criteria names to its own entry array.
//
// Two lists share one DndContext: Available (every option not yet selected, drag or "Add >" to
// select) and Sort By (the selected options in priority order, drag to reorder or move to
// Available, or use the ↑/↓/× buttons — a keyboard/screen-reader-accessible alternative to
// dragging, since drag-and-drop alone is not an accessible interaction: WCAG 2.5.7). The actual
// drop-target resolution lives in main/utils/citationSort.js's reorderAfterDrag so it's testable
// without simulating a real pointer drag.
export default function CitationSort({
  sortCriteria = DEFAULT_CITATION_SORT,
  onChange = () => {},
  testId = "CitationSort",
}) {
  const [expanded, setExpanded] = useState(true);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const available = CITATION_SORT_OPTIONS.filter(
    (option) => !sortCriteria.includes(option),
  );

  const handleDragEnd = ({ active, over }) => {
    const next = reorderAfterDrag(sortCriteria, active.id, over?.id);
    if (next !== sortCriteria) onChange(next);
  };

  return (
    <div data-testid={testId}>
      <div
        role="button"
        onClick={() => setExpanded((prev) => !prev)}
        data-testid={`${testId}-header`}
        className="d-flex justify-content-between align-items-center border rounded-3 p-2 mb-2"
        style={{ cursor: "pointer" }}
      >
        <strong>{expanded ? "Citation Sort" : "citation sort"}</strong>
        <span data-testid={`${testId}-toggle-icon`}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      <Collapse in={expanded}>
        <div data-testid={`${testId}-body`}>
          <div className="border rounded-3 p-3 mb-3">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="row">
                <div className="col-6">
                  <div className="fw-semibold mb-1">Available</div>
                  <DroppableList
                    id={AVAILABLE_CONTAINER_ID}
                    items={available}
                    testId={`${testId}-available-list`}
                  >
                    {available.length === 0 && (
                      <li
                        className="text-muted small p-2"
                        data-testid={`${testId}-available-list-empty`}
                      >
                        All criteria selected
                      </li>
                    )}
                    {available.map((criterion) => (
                      <AvailableItem
                        key={criterion}
                        criterion={criterion}
                        testId={testId}
                        onAdd={(c) => onChange(addCriterion(sortCriteria, c))}
                      />
                    ))}
                  </DroppableList>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1">Sort By (in order)</div>
                  <DroppableList
                    id={SELECTED_CONTAINER_ID}
                    items={sortCriteria}
                    testId={`${testId}-selected-list`}
                  >
                    {sortCriteria.length === 0 && (
                      <li
                        className="text-muted small p-2"
                        data-testid={`${testId}-selected-list-empty`}
                      >
                        No sort applied
                      </li>
                    )}
                    {sortCriteria.map((criterion, index) => (
                      <SelectedItem
                        key={criterion}
                        criterion={criterion}
                        index={index}
                        total={sortCriteria.length}
                        testId={testId}
                        onRemove={(c) =>
                          onChange(removeCriterion(sortCriteria, c))
                        }
                        onMove={(c, direction) =>
                          onChange(moveCriterion(sortCriteria, c, direction))
                        }
                      />
                    ))}
                  </DroppableList>
                </div>
              </div>
            </DndContext>
          </div>
        </div>
      </Collapse>
    </div>
  );
}
