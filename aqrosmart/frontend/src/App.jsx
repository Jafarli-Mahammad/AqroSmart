import React from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './pages/Dashboard'
import FarmDetail from './pages/FarmDetail'
import FieldAnalysis from './pages/FieldAnalysis'
import SimulationControl from './pages/SimulationControl'
import IrrigationHub from './pages/IrrigationHub'
import SubsidyEngine from './pages/SubsidyEngine'
import CreditScoring from './pages/CreditScoring'
import AdminDemo from './pages/AdminDemo'
import useScenarioStore from './store/scenarioStore'

function AppLayout() {
  const presentationMode = useScenarioStore((state) => state.presentationMode)

  if (presentationMode) {
    return (
      <div className="h-screen overflow-hidden bg-slate-100">
        <main className="h-full overflow-y-auto bg-slate-100">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/farms/:farmId" element={<FarmDetail />} />
          <Route path="/fields/:fieldId" element={<FieldAnalysis />} />
          <Route path="/simulation" element={<SimulationControl />} />
          <Route path="/irrigation" element={<IrrigationHub />} />
          <Route path="/subsidy" element={<SubsidyEngine />} />
          <Route path="/credit" element={<CreditScoring />} />
          <Route path="/admin" element={<AdminDemo />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
