import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import RoleEmailForm, {
  type RoleEmailFormFields,
} from "main/components/Users/RoleEmailForm";
import { useNavigate } from "react-router";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";
import type { AxiosRequestConfig } from "axios";

type ResearchersCreatePageProps = {
  storybook?: boolean;
};

export default function ResearchersCreatePage({
  storybook = false,
}: ResearchersCreatePageProps): React.JSX.Element {
  const navigation = useNavigate();
  const objectToAxiosParams = (
    researcher: RoleEmailFormFields,
  ): AxiosRequestConfig => ({
    url: "/api/admin/researchers/post",
    method: "POST",
    params: {
      email: researcher.email,
    },
  });

  const onSuccess = (researcher: RoleEmailFormFields) => {
    toast(`New researcher added - email: ${researcher.email}`);
    if (!storybook) navigation("/admin/researchers");
  };

  const mutation = useBackendMutation(
    objectToAxiosParams,
    { onSuccess },
    ["/api/admin/researchers/all"], // mutation makes this key stale so that pages relying on it reload
  );

  const onSubmit = async (data: RoleEmailFormFields) => {
    mutation.mutate(data);
  };

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Add New Researcher</h1>
        <RoleEmailForm submitAction={onSubmit} />
      </div>
    </BasicLayout>
  );
}
