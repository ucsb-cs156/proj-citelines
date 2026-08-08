import OurTable from "main/components/Common/OurTable";
import { Tooltip, OverlayTrigger, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router";
import LinkToScaffold from "../Scaffold/LinkToScaffold";

const baseColumns = [
  {
    header: "id",
    accessorKey: "id", // accessor is the "key" in the data
  },
  {
    header: "Course Name",
    accessorKey: "courseName",
  },
  {
    header: "Term",
    accessorKey: "term",
  },
  {
    header: "School",
    id: "school",
    accessorKey: "school.displayName",
  },
];

export default function CoursesTable({
  courses,
  testId,
  isLoading,
  courseNameLinkPrefix,
}) {
  const columns = courseNameLinkPrefix
    ? baseColumns.map((column) =>
        column.accessorKey === "courseName"
          ? {
              ...column,
              id: "courseName",
              cell: ({ cell }) => (
                <LinkToScaffold
                  course={cell.row.original}
                  testId={`${testId}-cell-row-${cell.row.index}-col-${cell.column.id}-link`}
                />
              ),
            }
          : column,
      )
    : baseColumns;

  return <OurTable data={courses} columns={columns} testid={testId} />;
}
