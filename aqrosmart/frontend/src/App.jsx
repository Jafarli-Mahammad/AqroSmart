import React, { Suspense, lazy } from 'react'
import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Spinner from './components/common/Spinner'
import ErrorBoundary from './components/common/ErrorBoundary'
import useScenarioStore from './store/scenarioStore'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Farms = lazy(() => import('./pages/Farms'))
const FarmDetail = lazy(() => import('./pages/FarmDetail'))
const FieldAnalysis = lazy(() => import('./pages/FieldAnalysis'))
const SimulationControl = lazy(() => import('./pages/SimulationControl'))
const IrrigationHub = lazy(() => import('./pages/IrrigationHub'))
const SubsidyEngine = lazy(() => import('./pages/SubsidyEngine'))
const CreditScoring = lazy(() => import('./pages/CreditScoring'))
const AdminDemo = lazy(() => import('./pages/AdminDemo'))
const PlantHealth = lazy(() => import('./pages/PlantHealth'))

function AppLayout() {
  const presentationMode = useScenarioStore((state) => state.presentationMode)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <Sidebar mobileOpen={mobileSidebarOpen} onOpen={() => setMobileSidebarOpen(true)} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-stone-50 transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function App() {
  const withBoundary = (component, message) => (
    <ErrorBoundary message={message}>
      <Suspense fallback={<Spinner />}>{component}</Suspense>
    </ErrorBoundary>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={withBoundary(<Dashboard />, 'İdarə paneli bölməsi render olunmadı.')} />
          <Route path="/farms" element={withBoundary(<Farms />, 'Təsərrüfatlar bölməsi render olunmadı.')} />
          <Route path="/farms/:farmId" element={withBoundary(<FarmDetail />, 'Təsərrüfat detalları render olunmadı.')} />
          <Route path="/fields/:fieldId" element={withBoundary(<FieldAnalysis />, 'Sahə təhlili bölməsi render olunmadı.')} />
          <Route path="/simulation" element={withBoundary(<SimulationControl />, 'Simulyasiya bölməsi render olunmadı.')} />
          <Route path="/irrigation" element={withBoundary(<IrrigationHub />, 'Suvarma bölməsi render olunmadı.')} />
          <Route path="/subsidy" element={withBoundary(<SubsidyEngine />, 'Subsidiya bölməsi render olunmadı.')} />
          <Route path="/credit" element={withBoundary(<CreditScoring />, 'Kredit skorinqi bölməsi render olunmadı.')} />
          <Route path="/plant-health" element={withBoundary(<PlantHealth />, 'Bitki sağlamlığı bölməsi render olunmadı.')} />
          <Route path="/admin" element={withBoundary(<AdminDemo />, 'Admin bölməsi render olunmadı.')} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
