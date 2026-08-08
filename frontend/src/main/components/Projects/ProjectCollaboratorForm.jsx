import { Button, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import regexUtils from "main/utils/regexUtils";

export default function ProjectCollaboratorForm({ submitAction }) {
  // Stryker disable all
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm();
  // Stryker restore all

  const testIdPrefix = "ProjectCollaboratorForm";

  return (
    <Form onSubmit={handleSubmit(submitAction)}>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="firstName">First Name</Form.Label>
        <Form.Control
          data-testid={testIdPrefix + "-firstName"}
          id="firstName"
          type="text"
          isInvalid={Boolean(errors.firstName)}
          {...register("firstName", {
            required: "First Name is required.",
          })}
        />
        <Form.Control.Feedback type="invalid">
          {errors.firstName?.message}
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label htmlFor="lastName">Last Name</Form.Label>
        <Form.Control
          data-testid={testIdPrefix + "-lastName"}
          id="lastName"
          type="text"
          isInvalid={Boolean(errors.lastName)}
          {...register("lastName", {
            required: "Last Name is required.",
          })}
        />
        <Form.Control.Feedback type="invalid">
          {errors.lastName?.message}
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label htmlFor="email">Email</Form.Label>
        <Form.Control
          data-testid={testIdPrefix + "-email"}
          id="email"
          type="text"
          isInvalid={Boolean(errors.email)}
          {...register("email", {
            required: "Email is required.",
            pattern: {
              value: regexUtils.email,
              message: "Please enter a valid email address.",
            },
          })}
        />
        <Form.Control.Feedback type="invalid">
          {errors.email?.message}
        </Form.Control.Feedback>
      </Form.Group>

      <Button type="submit" data-testid={testIdPrefix + "-submit"}>
        Add Collaborator
      </Button>
    </Form>
  );
}
