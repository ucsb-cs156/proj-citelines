import { useState } from "react";
import { Button, Dropdown } from "react-bootstrap";
import { toast } from "react-toastify";
import { useBackendMutation } from "main/utils/useBackend";
import TagModal from "main/components/Tags/TagModal";
import TagPill from "main/components/Tags/TagPill";

export default function TagSelector({
  allTags = [],
  assignedTags = [],
  onAddTag = () => {},
  onRemoveTag = () => {},
  projectId,
  canEdit = true,
  testId = "TagSelector",
}) {
  const assignedIds = new Set(assignedTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !assignedIds.has(tag.id));

  const [showNewTagModal, setShowNewTagModal] = useState(false);

  // Same query key TagsTabComponent uses for the project's tag list, so creating a tag here
  // invalidates/refreshes it too, regardless of which page's useBackend call owns that query.
  const tagsQueryKey = `/api/tags/project?projectId=${projectId}`;

  const createTagMutation = useBackendMutation(
    (tag) => ({
      url: "/api/tags/post",
      method: "POST",
      params: {
        projectId,
        tag: tag.tag,
        explanation: tag.explanation,
        color: tag.color,
      },
    }),
    {
      onSuccess: () => {
        toast("Tag successfully added.");
        setShowNewTagModal(false);
      },
      onError: (error) => {
        // Stryker disable next-line OptionalChaining : defensive coding for error shape
        if (error.response?.data?.message)
          toast(`Could not add tag:\n${error.response.data.message}`);
        else toast(`Could not add tag:\n${error.message}`);
      },
    },
    [tagsQueryKey],
  );

  return (
    <div data-testid={testId}>
      <TagModal
        showModal={showNewTagModal}
        toggleShowModal={setShowNewTagModal}
        onSubmitAction={(tag) => createTagMutation.mutate(tag)}
        testId={`${testId}-TagModal`}
      />
      <div
        className="d-flex flex-wrap align-items-center gap-2"
        data-testid={`${testId}-assigned-tags`}
      >
        {assignedTags.length === 0 && (
          <span data-testid={`${testId}-no-tags`} className="text-muted">
            No tags assigned
          </span>
        )}
        {assignedTags.map((tag) => (
          <span
            key={tag.id}
            className="d-inline-flex align-items-center"
            data-testid={`${testId}-assigned-tag-${tag.id}`}
          >
            <TagPill
              tag={tag}
              testId={`${testId}-assigned-tag-${tag.id}-badge`}
            />
            {canEdit && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1 text-decoration-none"
                aria-label={`Remove tag ${tag.tag}`}
                data-testid={`${testId}-remove-tag-${tag.id}`}
                onClick={() => onRemoveTag(tag)}
              >
                &times;
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="d-flex align-items-center gap-3 mt-2">
        {canEdit && (
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-primary"
              size="sm"
              data-testid={`${testId}-add-tag-dropdown`}
            >
              Add Tag
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {availableTags.length === 0 && (
                <Dropdown.Item
                  disabled
                  data-testid={`${testId}-no-available-tags`}
                >
                  No more tags available
                </Dropdown.Item>
              )}
              {availableTags.map((tag) => (
                <Dropdown.Item
                  key={tag.id}
                  as="button"
                  type="button"
                  data-testid={`${testId}-available-tag-${tag.id}`}
                  onClick={() => onAddTag(tag)}
                >
                  <TagPill
                    tag={tag}
                    testId={`${testId}-available-tag-${tag.id}-badge`}
                  />
                  {tag.explanation && (
                    <span className="ms-2 small text-muted">
                      {tag.explanation}
                    </span>
                  )}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}
        {canEdit && (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowNewTagModal(true)}
            data-testid={`${testId}-new-tag-button`}
          >
            New Tag
          </Button>
        )}
        <a
          href={`/project/${projectId}?tab=Tags`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-manage-tags-link`}
        >
          Manage Tags
        </a>
      </div>
    </div>
  );
}
