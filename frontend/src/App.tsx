import { BrowserRouter, Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminsIndexPage from "main/pages/Admin/AdminsIndexPage";
import AdminsCreatePage from "main/pages/Admin/AdminsCreatePage";
import InstructorsIndexPage from "main/pages/Admin/InstructorsIndexPage";
import InstructorsCreatePage from "main/pages/Admin/InstructorsCreatePage";
import ProtectedPage from "main/pages/Auth/ProtectedPage";
import LegacyHomePage from "main/pages/Home/LegacyHomePage";
import ConceptGraphPage from "main/pages/ConceptGraphPage";
import NotFoundPage from "main/pages/Auth/NotFoundPage";
import AboutScaffold from "main/pages/Help/AboutScaffold";
import SignInPage from "main/pages/Auth/SignInPage";
import SignInSuccessPage from "main/pages/Auth/SignInSuccessPage";

import { useCurrentUser } from "main/utils/currentUser";
import AdminDeveloperPage from "main/pages/Admin/AdminDeveloperPage";
import InstructorCoursesIndexPage from "main/pages/Courses/InstructorCoursesIndexPage";
import AdminCoursesIndexPage from "main/pages/Admin/AdminCoursesIndexPage";

import HomePageLoggedIn from "main/pages/Home/HomePageLoggedIn";
import HomePageLoggedOut from "main/pages/Home/HomePageLoggedOut";
import AdminJobsPage from "main/pages/Admin/AdminJobsPage";
import InstructorCourseShowPage from "main/pages/Courses/InstructorCourseShowPage";
import UserProfilePage from "main/pages/UserProfilePage";

export default function App() {
  const currentUser = useCurrentUser();

  const homePage = currentUser.loggedIn ? (
    <HomePageLoggedIn />
  ) : (
    <HomePageLoggedOut />
  );

  return (
    <BrowserRouter>
      {/* Renders every react-toastify toast() call; without it they are silent no-ops. */}
      <ToastContainer />
      <Routes>
        <Route path="/" element={homePage} />
        <Route path="/LegacyHomePage" element={<LegacyHomePage />} />
        <Route path="/about" element={<AboutScaffold />} />
        <Route
          path="/course/:courseId"
          element={
            <ProtectedPage
              component={<ConceptGraphPage />}
              enforceRole={"ROLE_USER"}
              currentUser={currentUser}
            />
          }
        />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/login/success" element={<SignInSuccessPage />} />
        <Route
          path="/admin/admins"
          element={
            <ProtectedPage
              component={<AdminsIndexPage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/admin/instructors"
          element={
            <ProtectedPage
              component={<InstructorsIndexPage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/admin/admins/create"
          element={
            <ProtectedPage
              component={<AdminsCreatePage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/admin/instructors/create"
          element={
            <ProtectedPage
              component={<InstructorsCreatePage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/admin/developer"
          element={
            <ProtectedPage
              component={<AdminDeveloperPage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedPage
              component={<AdminCoursesIndexPage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedPage
              component={<InstructorCoursesIndexPage />}
              enforceRole={"ROLE_INSTRUCTOR"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/course/:id/settings"
          element={
            <ProtectedPage
              component={<InstructorCourseShowPage />}
              enforceRole={"ROLE_INSTRUCTOR"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/admin/jobs"
          element={
            <ProtectedPage
              component={<AdminJobsPage />}
              enforceRole={"ROLE_ADMIN"}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedPage
              component={<UserProfilePage />}
              enforceRole={"ROLE_USER"}
              currentUser={currentUser}
            />
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
