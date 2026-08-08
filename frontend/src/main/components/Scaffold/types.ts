// Props shared by the course link components (LinkToScaffold, LinkToSettings).
// Each renders a link for one course. When the caller reuses the same testId
// across table rows, pass rowIndex to keep the rendered ids unique; when the
// testId is already unique, omit it and no suffix is added.
export interface CourseLinkProps {
  course: {
    id: number | string;
    courseName: string;
  };
  rowIndex?: number;
  testId?: string;
}
