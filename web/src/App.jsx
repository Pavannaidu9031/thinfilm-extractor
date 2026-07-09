import { Navigate, Route, Routes } from "react-router-dom";
import AboutPage from "./pages/AboutPage.jsx";
import Layout from "./components/Layout.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import PaperPage from "./pages/PaperPage.jsx";
import TemplatesPage from "./pages/TemplatesPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/library" replace />} />
        {/* Data pages require sign-in */}
        <Route path="/library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="/paper/:id" element={<RequireAuth><PaperPage /></RequireAuth>} />
        {/* Public pages */}
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
