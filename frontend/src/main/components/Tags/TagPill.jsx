import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getContrastTextColor } from "main/utils/colorUtils";

const DEFAULT_TAG_COLOR = "#6c757d";

// The single shared way a tag is ever rendered (issue #88): a pill badge in the tag's assigned
// color, with a tooltip showing its explanation on hover — but only when an explanation is
// actually present (explanation is optional), so hovering a description-less tag never pops up
// an empty tooltip bubble.
export default function TagPill({ tag, testId }) {
  const color = tag.color || DEFAULT_TAG_COLOR;
  const badge = (
    <Badge
      pill
      bg={null}
      style={{
        backgroundColor: color,
        color: getContrastTextColor(color),
      }}
      className="me-1"
      data-testid={testId}
    >
      {tag.tag}
    </Badge>
  );

  if (!tag.explanation) {
    return badge;
  }

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`${testId}-tooltip`}>{tag.explanation}</Tooltip>}
    >
      <span>{badge}</span>
    </OverlayTrigger>
  );
}
