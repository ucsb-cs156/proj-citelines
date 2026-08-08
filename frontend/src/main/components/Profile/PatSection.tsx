import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useBackendMutation } from "main/utils/useBackend";

// Shape of the /api/pat/* responses (entity/PatCredential.java). The ciphertext
// and keyVersion fields are @JsonIgnore'd on the backend, so the token itself
// never appears here — only metadata about it.
export interface PatCredential {
  id: number;
  userId: number;
  platform: string;
  lastFour: string;
  expiresAt: string | null;
}

interface PatSectionProps {
  // Heading and form label, e.g. "GitHub PAT" or "PrairieLearn PAT".
  title: string;
  // Backend endpoint for both GET (metadata) and POST (set), e.g. "/api/pat/github".
  endpoint: string;
  testIdPrefix: string;
}

// The GET returns 404 (not an empty body) when no token is on file yet.
async function fetchPatCredential(
  endpoint: string,
): Promise<PatCredential | null> {
  try {
    const response = await axios.get<PatCredential>(endpoint);
    return response.data;
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 404) {
      return null;
    }
    throw e;
  }
}

type PatFormFields = {
  token: string;
  expiresAt?: string;
};

/**
 * One "enter your personal access token" section of the profile page: shows
 * metadata about the stored token (never the token itself) and a form to set
 * or replace it. Used once per platform (GitHub, PrairieLearn).
 */
export default function PatSection({
  title,
  endpoint,
  testIdPrefix,
}: PatSectionProps) {
  const { data: patCredential } = useQuery<PatCredential | null>({
    queryKey: [endpoint],
    queryFn: () => fetchPatCredential(endpoint),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatFormFields>();

  const mutation = useBackendMutation(
    (data: PatFormFields) => ({
      url: endpoint,
      method: "POST",
      params: {
        token: data.token,
        expiresAt: data.expiresAt || undefined,
      },
    }),
    {
      onSuccess: () => {
        toast(`${title} saved`);
        reset();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message ?? `Error saving ${title}`;
        toast.error(message);
      },
    },
    [endpoint],
  );

  const onSubmit = (data: PatFormFields) => mutation.mutate(data);

  return (
    <div data-testid={`${testIdPrefix}-section`}>
      <h2>{title}</h2>
      {patCredential ? (
        <p data-testid={`${testIdPrefix}-status`}>
          PAT: ******{patCredential.lastFour}, expires:{" "}
          {patCredential.expiresAt ?? "not specified"}
        </p>
      ) : (
        <p data-testid={`${testIdPrefix}-status`}>No PAT set</p>
      )}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Form.Group className="mb-2">
          <Form.Label htmlFor={`${testIdPrefix}-token`}>{title}</Form.Label>
          <Form.Control
            data-testid={`${testIdPrefix}-token`}
            id={`${testIdPrefix}-token`}
            type="text"
            isInvalid={Boolean(errors.token)}
            {...register("token", { required: true })}
          />
          <Form.Control.Feedback type="invalid">
            {errors.token && `A ${title} is required.`}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label htmlFor={`${testIdPrefix}-expiresAt`}>
            Expiration Date (optional)
          </Form.Label>
          <Form.Control
            data-testid={`${testIdPrefix}-expiresAt`}
            id={`${testIdPrefix}-expiresAt`}
            type="date"
            {...register("expiresAt")}
          />
        </Form.Group>
        <Button type="submit" data-testid={`${testIdPrefix}-submit`}>
          Set PAT
        </Button>
      </Form>
    </div>
  );
}
