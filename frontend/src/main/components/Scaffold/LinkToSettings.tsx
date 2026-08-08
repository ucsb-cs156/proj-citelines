import { Tooltip, OverlayTrigger } from "react-bootstrap";
import { Link } from "react-router";
import { UserListIcon } from "main/components/Common/Icons";
import type { CourseLinkProps } from "main/components/Scaffold/types";

export default function LinkToSettings({
  course,
  rowIndex,
  testId = "LinkToSettings",
}: CourseLinkProps) {
  const suffix = rowIndex === undefined ? "" : `-${rowIndex}`;
  return (
    <OverlayTrigger
      placement="right"
      overlay={
        <Tooltip id={`${testId}-tooltip-coursename${suffix}`}>
          Settings and Course Roster for {course.courseName}
        </Tooltip>
      }
    >
      <Link
        to={`/course/${course.id}/settings`}
        data-testid={`${testId}${suffix}`}
      >
        <UserListIcon />
      </Link>
    </OverlayTrigger>
  );
}
