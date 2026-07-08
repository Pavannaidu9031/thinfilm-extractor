import { Navigate, Route, Routes } from "react-router-dom";
import AboutPage from "./pages/AboutPage.jsx";
import Layout from "./components/Layout.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import PaperPage from "./pages/PaperPage.jsx";
import TemplatesPage from "./pages/TemplatesPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/paper/:id" element={<PaperPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
