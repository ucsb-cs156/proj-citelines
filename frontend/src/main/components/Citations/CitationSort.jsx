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
  toggleDirection,
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

function SelectedItem({
  field,
  direction,
  index,
  testId,
  onRemove,
  onToggleDirection,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isAscending = direction === "asc";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="d-flex align-items-center justify-content-between border rounded-2 p-2 mb-1 bg-white"
      data-testid={`${testId}-selected-item-${field}`}
    >
      <span className="d-flex align-items-center">
        <span
          {...attributes}
          {...listeners}
          className="me-2"
          style={{ cursor: "grab" }}
          data-testid={`${testId}-selected-item-${field}-handle`}
        >
          ⠿
        </span>
        {index + 1}. {field}
      </span>
      <span>
        <Button
          size="sm"
          variant="outline-secondary"
          className="me-1"
          aria-label={`${field} sorts ${isAscending ? "ascending" : "descending"} — click to sort ${isAscending ? "descending" : "ascending"} instead`}
          data-testid={`${testId}-selected-item-${field}-direction`}
          onClick={() => onToggleDirection(field)}
        >
          {isAscending ? "↑" : "↓"}
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          aria-label={`Remove ${field}`}
          data-testid={`${testId}-selected-item-${field}-remove`}
          onClick={() => onRemove(field)}
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
// owns the `sortCriteria` value (typically starting from DEFAULT_CITATION_SORT, an array of
// {field, direction} objects) and is responsible for applying it to its own entry array.
//
// Two lists share one DndContext: Available (every field not yet selected, drag or "Add >" to
// select) and Sort By (the selected fields in priority order, drag to reorder or move back to
// Available). Each Sort By chip has its own ↑/↓ direction toggle (issue #112) — reordering is
// drag's job, so the arrows control ascending/descending for that field instead, which is what
// makes it possible to sort by any field in any order with any direction. The ×/direction
// buttons are also a keyboard/screen-reader-accessible alternative to dragging, since
// drag-and-drop alone is not an accessible interaction (WCAG 2.5.7). The actual drop-target
// resolution lives in main/utils/citationSort.js's reorderAfterDrag so it's testable without
// simulating a real pointer drag.
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

  const selectedFields = sortCriteria.map((c) => c.field);
  const available = CITATION_SORT_OPTIONS.filter(
    (option) => !selectedFields.includes(option),
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
                <div className="col-12 col-md-6 mb-3 mb-md-0">
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
                <div className="col-12 col-md-6 mb-3 mb-md-0">
                  <div className="fw-semibold mb-1">Sort By (in order)</div>
                  <DroppableList
                    id={SELECTED_CONTAINER_ID}
                    items={selectedFields}
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
                    {sortCriteria.map(({ field, direction }, index) => (
                      <SelectedItem
                        key={field}
                        field={field}
                        direction={direction}
                        index={index}
                        testId={testId}
                        onRemove={(f) =>
                          onChange(removeCriterion(sortCriteria, f))
                        }
                        onToggleDirection={(f) =>
                          onChange(toggleDirection(sortCriteria, f))
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
