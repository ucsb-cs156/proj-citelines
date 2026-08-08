import { Link } from "react-router";
import { hasRole, type CurrentUser } from "main/utils/currentUser";
import type { SystemInfo } from "main/utils/systemInfo";
import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import GoogleLogin from "main/components/Nav/GoogleLogin";
import AppNavbarLocalhost from "main/components/Nav/AppNavbarLocalhost";
import ScaffoldBrand from "main/components/Scaffold/ScaffoldBrand";
import CourseMenu from "main/components/Courses/CourseMenu";

export default function AppNavbar({
  currentUser,
  systemInfo,
  doLogout,
  currentUrl = window.location.href,
}: {
  currentUser: CurrentUser;
  systemInfo?: SystemInfo;
  doLogout: () => void;
  currentUrl?: string;
}): React.JSX.Element {
  const handleLogin = () => {
    window.location.href =
      systemInfo?.oauthLogin ?? "/oauth2/authorization/google";
  };

  return (
    <>
      {(currentUrl.startsWith("http://localhost:3000") ||
        currentUrl.startsWith("http://127.0.0.1:3000")) && (
        <AppNavbarLocalhost url={currentUrl} />
      )}
      <Navbar
        expand="md"
        sticky="top"
        data-testid="AppNavbar"
        className="AppNavbar"
      >
        <Container>
          <Navbar.Brand as={Link} to="/">
            <ScaffoldBrand />
          </Navbar.Brand>

          <Navbar.Toggle />

          <>
            {/* be sure that each NavDropdown has a unique id and data-testid  */}
          </>

          <Navbar.Collapse className="justify-content-between">
            <Nav className="mr-auto">
              <CourseMenu currentUser={currentUser} />
              {systemInfo?.showSwaggerUILink && (
                <>
                  <Nav.Link href="/swagger-ui/index.html">Swagger</Nav.Link>
                </>
              )}
              {systemInfo?.springH2ConsoleEnabled && (
                <>
                  <Nav.Link href="/h2-console">H2Console</Nav.Link>
                </>
              )}
              {hasRole(currentUser, "ROLE_ADMIN") && (
                <NavDropdown
                  title="Admin"
                  id="appnavbar-admin-dropdown"
                  data-testid="appnavbar-admin-dropdown"
                >
                  <NavDropdown.Item as={Link} to="/admin/admins">
                    Admins
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/admin/instructors">
                    Instructors
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/admin/courses">
                    Courses
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/admin/developer">
                    Developer Info
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/LegacyHomePage">
                    LegacyHomePage
                  </NavDropdown.Item>
                </NavDropdown>
              )}
              {hasRole(currentUser, "ROLE_INSTRUCTOR") && (
                <NavDropdown
                  title="Instructor"
                  id="appnavbar-instructor-dropdown"
                  data-testid="appnavbar-instructor-dropdown"
                >
                  <NavDropdown.Item as={Link} to="/courses">
                    Courses
                  </NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>
            <Nav className="ml-auto">
              <GoogleLogin
                currentUser={currentUser}
                handleLogin={handleLogin}
                doLogout={doLogout}
              />
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}
