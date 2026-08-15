import { toast } from "react-toastify";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import { useState } from "react";
import { Button, Row } from "react-bootstrap";
import TagModal from "main/components/Tags/TagModal";
import TagTable from "main/components/Tags/TagTable";

export default function TagsTabComponent({
  projectId,
  testIdPrefix = "TagsTabComponent",
  canEdit = true,
}) {
  const [postModal, showPostModal] = useState(false);

  const queryKey = `/api/tags/project?projectId=${projectId}`;

  const { data: tags } = useBackend(
    [queryKey],
    // Stryker disable next-line StringLiteral : GET and empty string are equivalent
    { method: "GET", url: queryKey },
    [],
    true,
  );

  const objectToAxiosParamsPost = (tag) => ({
    url: `/api/tags/post`,
    method: "POST",
    params: {
      projectId: projectId,
      tag: tag.tag,
      explanation: tag.explanation,
    },
  });

  const onSuccessPost = () => {
    toast("Tag successfully added.");
    showPostModal(false);
  };

  const onErrorPost = (error) => {
    // Stryker disable next-line OptionalChaining : defensive coding for error shape
    if (error.response?.data?.message)
      toast(`Could not add tag:\n${error.response.data.message}`);
    else toast(`Could not add tag:\n${error.message}`);
  };

  const tagPostMutation = useBackendMutation(
    objectToAxiosParamsPost,
    { onSuccess: onSuccessPost, onError: onErrorPost },
    [queryKey],
  );

  const handlePostSubmit = (tag) => {
    tagPostMutation.mutate(tag);
  };

  return (
    <div
      data-testid={`${testIdPrefix}-TagsTabComponent`}
      className="tabComponent"
    >
      <TagModal
        showModal={postModal}
        toggleShowModal={showPostModal}
        onSubmitAction={handlePostSubmit}
        testId={`${testIdPrefix}-TagModal`}
      />
      {canEdit && (
        <Row className="p-2">
          <Button
            onClick={() => showPostModal(true)}
            data-testid={`${testIdPrefix}-post-button`}
          >
            Add Tag
          </Button>
        </Row>
      )}
      <Row>
        <TagTable
          tags={tags}
          projectId={projectId}
          canEdit={canEdit}
          testId={`${testIdPrefix}-TagTable`}
          mutationQueryKey={queryKey}
        />
      </Row>
    </div>
  );
}
