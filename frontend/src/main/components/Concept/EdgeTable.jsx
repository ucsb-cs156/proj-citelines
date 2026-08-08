import OurTable, { ButtonColumn } from "main/components/Common/OurTable";

export default function EdgeTable({
  edges = [],
  deleteCallback = () => {},
  testId = "EdgeTable",
}) {
  const columns = [
    {
      header: "id",
      accessorKey: "id",
      id: "id",
    },
    {
      header: "From (source)",
      accessorKey: "sourceLabel",
      id: "sourceLabel",
    },
    {
      header: "To (target)",
      accessorKey: "targetLabel",
      id: "targetLabel",
    },
    ButtonColumn("Delete", "danger", deleteCallback, testId),
  ];

  return <OurTable data={edges} columns={columns} testid={testId} />;
}
