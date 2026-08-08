import React from "react";
import { Button, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import axios from "axios";
import { useBackendMutation } from "main/utils/useBackend";

/**
 * Sanitizes a value for use in a downloaded filename: trims surrounding
 * whitespace, replaces any run of characters that are not letters or digits
 * with a single dash, and strips any leading/trailing dashes left behind.
 * Returns "" for null/undefined input.
 *
 * Examples: "CMPSC 8" -> "CMPSC-8"; " Fall 2026! " -> "Fall-2026"; null -> "".
 *
 * @param {*} value the value to sanitize (coerced to a string)
 * @returns {string} the sanitized, filename-safe string
 */
const sanitizeForFilename = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function ScaffoldTabComponent({
  courseId,
  courseName,
  term,
  school,
  testIdPrefix,
}) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm();

  const downloadYaml = async () => {
    try {
      const response = await axios({
        url: "/api/concepts/yaml/download",
        method: "GET",
        params: { courseId },
      });
      const blob = new Blob([response.data], { type: "application/x-yaml" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const schoolKey = school?.key ?? school;
      const filename = [
        "Scaffold",
        sanitizeForFilename(courseName),
        sanitizeForFilename(term),
        sanitizeForFilename(schoolKey),
        courseId,
      ]
        .filter((part) => part !== "" && part !== undefined && part !== null)
        .join("-");
      link.setAttribute("download", `${filename}.yml`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(`Error downloading concepts YAML: ${error.message}`);
    }
  };

  const objectToAxiosParamsUpload = (formData) => {
    const file = new FormData();
    file.append("file", formData.upload[0]);
    return {
      url: "/api/concepts/yaml/upload",
      method: "POST",
      data: file,
      params: {
        courseId,
      },
    };
  };

  const uploadMutation = useBackendMutation(objectToAxiosParamsUpload, {
    onSuccess: (report) => {
      toast(
        `Concepts replaced: ${report.conceptsCreated} concepts, ` +
          `${report.subconceptsCreated} subconcepts, ${report.edgesCreated} edges, ` +
          `${report.practiceProblemsCreated} practice problems. ` +
          `Saved scaffold state was cleared for ${report.userStatesCleared} user(s).`,
      );
      reset();
    },
    onError: (error) => {
      toast.error(
        `Error uploading concepts YAML: ${JSON.stringify(error.response.data, null, 2)}`,
      );
    },
  });

  return (
    <div className="tabComponent" data-testid={`${testIdPrefix}-scaffoldTab`}>
      <h2>Scaffold</h2>
      <p>
        Download this course&apos;s concepts, subconcepts, prerequisite edges,
        and practice problems as an editable YAML file, or replace them by
        uploading one. See <code>docs/yaml-format.md</code> for the file format.
      </p>
      <Button
        onClick={downloadYaml}
        data-testid={`${testIdPrefix}-download-yaml-button`}
      >
        Download Concepts YAML
      </Button>
      <Form onSubmit={handleSubmit(uploadMutation.mutate)} className="mt-4">
        <Form.Group className="mb-2">
          <Form.Label htmlFor="concepts-yaml-upload">
            Upload Concepts YAML
          </Form.Label>
          <Form.Control
            data-testid={`${testIdPrefix}-upload-yaml-input`}
            id="concepts-yaml-upload"
            type="file"
            accept=".yaml,.yml"
            isInvalid={Boolean(errors.upload)}
            {...register("upload", { required: true })}
          />
          <Form.Control.Feedback type="invalid">
            {errors.upload && "Concepts YAML file is required."}
          </Form.Control.Feedback>
          <Form.Text muted>
            Warning: uploading replaces ALL concepts, subconcepts, edges, and
            practice problems for this course, and clears every student&apos;s
            saved scaffold state.
          </Form.Text>
        </Form.Group>
        <Button
          type="submit"
          data-testid={`${testIdPrefix}-upload-yaml-button`}
          className="mt-3"
        >
          Upload
        </Button>
      </Form>
    </div>
  );
}
