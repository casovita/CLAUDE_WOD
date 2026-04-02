import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useWorkouts } from './hooks/useWorkouts';
import { OverviewPage } from './pages/OverviewPage';
import { StrengthPage } from './pages/StrengthPage';
import { PRBoardPage } from './pages/PRBoardPage';
import { WorkoutLogPage } from './pages/WorkoutLogPage';
import { UploadPage } from './pages/UploadPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

export default function App() {
  const { workouts, save } = useWorkouts();

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<OverviewPage workouts={workouts} />} />
          <Route path="/strength" element={<StrengthPage workouts={workouts} />} />
          <Route path="/prs" element={<PRBoardPage workouts={workouts} />} />
          <Route path="/log" element={<WorkoutLogPage workouts={workouts} />} />
          <Route path="/heatmap" element={<HeatmapPage workouts={workouts} />} />
          <Route
            path="/upload"
            element={
              <UploadPage
                onImport={save}
                currentCount={workouts.length}
              />
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
