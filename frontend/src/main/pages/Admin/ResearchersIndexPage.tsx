import { useBackend } from "main/utils/useBackend";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import RoleEmailTable, {
  type RoleEmail,
} from "main/components/Users/RoleEmailTable";
import { Link } from "react-router";

export default function ResearchersIndexPage(): React.JSX.Element {
  const { data: researchers } = useBackend<RoleEmail[]>(
    ["/api/admin/researchers/get"],
    { method: "GET", url: "/api/admin/researchers/get" },
    // Stryker disable next-line all : don't test default value of empty list
    [],
  );

  const createButton = () => {
    return (
      <Link
        className="btn btn-primary"
        to="/admin/researchers/create"
        style={{ float: "right" }}
      >
        New Researcher
      </Link>
    );
  };

  return (
    <BasicLayout>
      <div className="pt-2">
        {createButton()}
        <h1>Researchers</h1>
        <RoleEmailTable
          data={researchers ?? []}
          deleteEndpoint="/api/admin/researchers/delete"
          getEndpoint="/api/admin/researchers/get"
          testIdPrefix="ResearchersIndexPage"
        />
      </div>
    </BasicLayout>
  );
}
