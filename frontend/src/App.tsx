import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import ActorDetail from "./pages/ActorDetail";
import AudioWorkspace from "./pages/AudioWorkspace";
import RegionBrowser from "./pages/RegionBrowser";
import SpeakerList from "./pages/SpeakerList";
import SpeakerDetail from "./pages/SpeakerDetail";
import AccentProfileList from "./pages/AccentProfileList";
import AccentProfileDetail from "./pages/AccentProfileDetail";
import SampleLibrary from "./pages/SampleLibrary";
import ImportManager from "./pages/ImportManager";
import Discovery from "./pages/Discovery";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/actors/:id" element={<ActorDetail />} />
        <Route path="/audio/:id" element={<AudioWorkspace />} />
        <Route path="/regions" element={<RegionBrowser />} />
        <Route path="/speakers" element={<SpeakerList />} />
        <Route path="/speakers/:id" element={<SpeakerDetail />} />
        <Route path="/accent-profiles" element={<AccentProfileList />} />
        <Route path="/accent-profiles/:id" element={<AccentProfileDetail />} />
        <Route path="/samples" element={<SampleLibrary />} />
        <Route path="/imports" element={<ImportManager />} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
