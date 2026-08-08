import OurTable, { ButtonColumn } from "main/components/Common/OurTable";

export default function SubConceptTable({
  subConcepts = [],
  editCallback = () => {},
  deleteCallback = () => {},
  testId = "SubConceptTable",
}) {
  const columns = [
    {
      header: "id",
      accessorKey: "id",
      id: "id",
    },
    {
      header: "label",
      accessorKey: "label",
      id: "label",
    },
    {
      header: "parentId",
      accessorKey: "parentId",
      id: "parentId",
    },
    {
      header: "parentLabel",
      accessorKey: "parentLabel",
      id: "parentLabel",
    },
    {
      header: "parentLevel",
      accessorKey: "parentLevel",
      id: "parentLevel",
    },
    {
      header: "parentX",
      accessorKey: "parentX",
      id: "parentX",
    },
    {
      header: "sortOrder",
      accessorKey: "sortOrder",
      id: "sortOrder",
    },
    ButtonColumn("Edit", "primary", editCallback, testId),
    ButtonColumn("Delete", "danger", deleteCallback, testId),
  ];

  const sortedSubConcepts = [...subConcepts].sort((a, b) => {
    if ((a.parentLevel ?? 0) !== (b.parentLevel ?? 0)) {
      return (a.parentLevel ?? 0) - (b.parentLevel ?? 0);
    }

    if ((a.parentX ?? 0) !== (b.parentX ?? 0)) {
      return (a.parentX ?? 0) - (b.parentX ?? 0);
    }

    if ((a.parentLabel ?? "") !== (b.parentLabel ?? "")) {
      return (a.parentLabel ?? "").localeCompare(b.parentLabel ?? "");
    }

    if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }

    return (a.id ?? 0) - (b.id ?? 0);
  });

  return (
    <OurTable data={sortedSubConcepts} columns={columns} testid={testId} />
  );
}
