import { Tooltip, OverlayTrigger } from "react-bootstrap";
import { Link } from "react-router";
import { GraphIcon } from "main/components/Common/Icons";
import type { CourseLinkProps } from "main/components/Scaffold/types";

export default function LinkToScaffold({
  course,
  rowIndex,
  testId = "LinkToScaffold",
}: CourseLinkProps) {
  const suffix = rowIndex === undefined ? "" : `-${rowIndex}`;
  return (
    <OverlayTrigger
      placement="right"
      overlay={
        <Tooltip id={`${testId}-tooltip-coursename${suffix}`}>
          View scaffold for {course.courseName}
        </Tooltip>
      }
    >
      <Link to={`/course/${course.id}`} data-testid={`${testId}${suffix}`}>
        <GraphIcon className="me-2" />
        {course.courseName}
      </Link>
    </OverlayTrigger>
  );
}
