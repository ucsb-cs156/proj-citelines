import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScaffoldTabComponent from "main/components/Courses/TabComponent/ScaffoldTabComponent";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { vi } from "vitest";

const axiosMock = new AxiosMockAdapter(axios);
const mockToast = vi.fn();
const mockToastError = vi.fn();

vi.mock("react-toastify", async (importOriginal) => {
  const originalModule = await importOriginal();
  const toast = (x) => mockToast(x);
  toast.error = (x) => mockToastError(x);
  return {
    ...originalModule,
    toast,
  };
});

const SAMPLE_YAML =
  "format: 1\nconcepts:\n  - id: 1\n    label: Recursion\nedges: []\n";

const successReport = {
  success: true,
  errors: [],
  conceptsCreated: 3,
  subconceptsCreated: 2,
  edgesCreated: 1,
  practiceProblemsCreated: 4,
  userStatesCleared: 17,
};

const renderScaffoldTabComponent = (props = {}) => {
  const queryClient = new QueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ScaffoldTabComponent
        courseId={1}
        courseName="CMPSC 8"
        term="S26"
        school={{ key: "UCSB", displayName: "UCSB" }}
        testIdPrefix="test"
        {...props}
      />
    </QueryClientProvider>,
  );
};

describe("ScaffoldTabComponent tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    mockToast.mockClear();
    mockToastError.mockClear();
  });

  test("renders the Scaffold heading", () => {
    renderScaffoldTabComponent();
    expect(screen.getByText("Scaffold")).toBeInTheDocument();
  });

  test("renders with correct data-testid", () => {
    renderScaffoldTabComponent();
    expect(screen.getByTestId("test-scaffoldTab")).toBeInTheDocument();
  });

  test("renders with custom testIdPrefix", () => {
    renderScaffoldTabComponent({
      testIdPrefix: "InstructorCourseShowPage",
    });
    expect(
      screen.getByTestId("InstructorCourseShowPage-scaffoldTab"),
    ).toBeInTheDocument();
  });

  test("renders button labels and the replace-all warning", () => {
    renderScaffoldTabComponent();
    expect(screen.getByTestId("test-download-yaml-button")).toHaveTextContent(
      "Download Concepts YAML",
    );
    expect(screen.getByTestId("test-upload-yaml-button")).toHaveTextContent(
      "Upload",
    );
    expect(screen.getByText("Upload Concepts YAML")).toBeInTheDocument();
    expect(
      screen.getByText(/Warning: uploading replaces ALL concepts/),
    ).toBeInTheDocument();
  });

  test("download button fetches the YAML and saves it as a file", async () => {
    axiosMock.onGet("/api/concepts/yaml/download").reply(200, SAMPLE_YAML);

    const createObjectURL = vi.fn(() => "blob:fake-url");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    let hrefDuringClick = null;
    let connectedDuringClick = null;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        hrefDuringClick = this.getAttribute("href");
        connectedDuringClick = this.isConnected;
      });

    renderScaffoldTabComponent({ courseId: 42 });
    fireEvent.click(screen.getByTestId("test-download-yaml-button"));

    const yamlGets = () =>
      axiosMock.history.get.filter(
        (r) => r.url === "/api/concepts/yaml/download",
      );
    await waitFor(() => expect(yamlGets().length).toBe(1));
    expect(yamlGets()[0].params).toEqual({ courseId: 42 });

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/x-yaml");
    expect(await blob.text()).toBe(SAMPLE_YAML);
    // The temporary anchor points at the blob, is attached to the document when
    // clicked, and is cleaned up (removed, object URL revoked) afterward.
    expect(hrefDuringClick).toBe("blob:fake-url");
    expect(connectedDuringClick).toBe(true);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    expect(mockToastError).not.toHaveBeenCalled();

    click.mockRestore();
  });

  test("download names the file after the course", async () => {
    axiosMock.onGet("/api/concepts/yaml/download").reply(200, SAMPLE_YAML);

    window.URL.createObjectURL = vi.fn(() => "blob:fake-url");
    window.URL.revokeObjectURL = vi.fn();
    let downloadAttribute = null;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        downloadAttribute = this.getAttribute("download");
      });

    renderScaffoldTabComponent({
      courseId: 7,
      courseName: "CMPSC 8",
      term: "S26",
      school: { key: "UCSB", displayName: "UCSB" },
    });
    fireEvent.click(screen.getByTestId("test-download-yaml-button"));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(downloadAttribute).toBe("Scaffold-CMPSC-8-S26-UCSB-7.yml");

    click.mockRestore();
  });

  test("download sanitizes course name and term when building the filename", async () => {
    axiosMock.onGet("/api/concepts/yaml/download").reply(200, SAMPLE_YAML);

    window.URL.createObjectURL = vi.fn(() => "blob:fake-url");
    window.URL.revokeObjectURL = vi.fn();
    let downloadAttribute = null;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        downloadAttribute = this.getAttribute("download");
      });

    renderScaffoldTabComponent({
      courseId: 42,
      courseName: "CMPSC 156: Intro to S/W Eng.",
      term: "Fall 2026",
      school: { key: "OTHER", displayName: "Other" },
    });
    fireEvent.click(screen.getByTestId("test-download-yaml-button"));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(downloadAttribute).toBe(
      "Scaffold-CMPSC-156-Intro-to-S-W-Eng-Fall-2026-OTHER-42.yml",
    );

    click.mockRestore();
  });

  test("download omits missing course details instead of leaving blank segments", async () => {
    axiosMock.onGet("/api/concepts/yaml/download").reply(200, SAMPLE_YAML);

    window.URL.createObjectURL = vi.fn(() => "blob:fake-url");
    window.URL.revokeObjectURL = vi.fn();
    let downloadAttribute = null;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        downloadAttribute = this.getAttribute("download");
      });

    renderScaffoldTabComponent({
      courseId: 9,
      courseName: undefined,
      term: undefined,
      school: undefined,
    });
    fireEvent.click(screen.getByTestId("test-download-yaml-button"));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(downloadAttribute).toBe("Scaffold-9.yml");

    click.mockRestore();
  });

  test("download shows an error toast when the request fails", async () => {
    axiosMock.onGet("/api/concepts/yaml/download").reply(403);

    renderScaffoldTabComponent({ courseId: 42 });
    fireEvent.click(screen.getByTestId("test-download-yaml-button"));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Error downloading concepts YAML: Request failed with status code 403",
      ),
    );
  });

  test("upload posts the file and reports what was created", async () => {
    axiosMock.onPost("/api/concepts/yaml/upload").reply(200, successReport);

    renderScaffoldTabComponent({ courseId: 42 });

    const file = new File([SAMPLE_YAML], "concepts.yaml", {
      type: "application/x-yaml",
    });
    await userEvent.upload(screen.getByTestId("test-upload-yaml-input"), file);
    fireEvent.click(screen.getByTestId("test-upload-yaml-button"));

    await waitFor(() =>
      expect(
        axiosMock.history.post.filter(
          (r) => r.url === "/api/concepts/yaml/upload",
        ).length,
      ).toBe(1),
    );
    const uploadRequest = axiosMock.history.post.find(
      (r) => r.url === "/api/concepts/yaml/upload",
    );
    expect(uploadRequest.params).toEqual({ courseId: 42 });
    const formData = uploadRequest.data;
    expect(formData.get("file")).toBe(file);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Concepts replaced: 3 concepts, 2 subconcepts, 1 edges, " +
          "4 practice problems. Saved scaffold state was cleared for 17 user(s).",
      ),
    );
  });

  test("upload shows the backend's error report when the file is invalid", async () => {
    const failureReport = {
      success: false,
      errors: ["concepts[0]: id is required"],
      conceptsCreated: 0,
      subconceptsCreated: 0,
      edgesCreated: 0,
      practiceProblemsCreated: 0,
      userStatesCleared: 0,
    };
    axiosMock.onPost("/api/concepts/yaml/upload").reply(400, failureReport);

    renderScaffoldTabComponent({ courseId: 42 });

    const file = new File(["format: 2"], "concepts.yaml", {
      type: "application/x-yaml",
    });
    await userEvent.upload(screen.getByTestId("test-upload-yaml-input"), file);
    fireEvent.click(screen.getByTestId("test-upload-yaml-button"));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        `Error uploading concepts YAML: ${JSON.stringify(failureReport, null, 2)}`,
      ),
    );
    expect(mockToast).not.toHaveBeenCalled();
  });

  test("upload requires a file", async () => {
    renderScaffoldTabComponent({ courseId: 42 });

    fireEvent.click(screen.getByTestId("test-upload-yaml-button"));

    await waitFor(() =>
      expect(
        screen.getByText("Concepts YAML file is required."),
      ).toBeInTheDocument(),
    );
    expect(
      axiosMock.history.post.filter(
        (r) => r.url === "/api/concepts/yaml/upload",
      ).length,
    ).toBe(0);
  });
});
