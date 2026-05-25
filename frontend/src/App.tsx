import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import ActorDetail from "./pages/ActorDetail";
import AudioWorkspace from "./pages/AudioWorkspace";
import ImportManager from "./pages/ImportManager";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/actors/:id" element={<ActorDetail />} />
        <Route path="/audio/:id" element={<AudioWorkspace />} />
        <Route path="/imports" element={<ImportManager />} />
      </Routes>
    </Layout>
  );
}
