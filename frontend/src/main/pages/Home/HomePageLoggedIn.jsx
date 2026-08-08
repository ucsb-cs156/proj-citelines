import BasicLayout from "main/layouts/BasicLayout/BasicLayout";

export default function HomePageLoggedIn() {
  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Citelines</h1>
        <p data-testid="HomePageLoggedIn-placeholder">
          This is a placeholder home page.
        </p>
      </div>
    </BasicLayout>
  );
}
