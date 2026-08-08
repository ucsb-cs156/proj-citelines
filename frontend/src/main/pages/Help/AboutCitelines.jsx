import BasicLayout from "main/layouts/BasicLayout/BasicLayout";

export default function AboutCitelines() {
  return (
    <BasicLayout>
      <h1>About Citelines</h1>

      <p>
        Citelines is a UCSB CS project. This application shell was built from{" "}
        <a href="https://github.com/ucsb-cs156/proj-scaffold">proj-scaffold</a>,
        and provides Google sign-in, Admin/Researcher role management, a
        background jobs subsystem, and a Developer page.
      </p>
    </BasicLayout>
  );
}
