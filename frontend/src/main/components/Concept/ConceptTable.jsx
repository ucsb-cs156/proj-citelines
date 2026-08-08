import OurTable, { ButtonColumn } from "main/components/Common/OurTable";

export default function ConceptTable({
  concepts = [],
  editCallback = () => {},
  deleteCallback = () => {},
  showButtons = true,
  testId = "ConceptTable",
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
      header: "level",
      accessorKey: "level",
      id: "level",
    },
    {
      header: "x",
      accessorKey: "x",
      id: "x",
    },
    {
      header: "y",
      accessorKey: "y",
      id: "y",
    },
  ];

  if (showButtons) {
    columns.push(
      ButtonColumn("Edit", "primary", editCallback, testId),
      ButtonColumn("Delete", "danger", deleteCallback, testId),
    );
  }

  return <OurTable data={concepts} columns={columns} testid={testId} />;
}
