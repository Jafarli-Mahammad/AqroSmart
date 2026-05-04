import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Spinner from './components/common/Spinner'
import ErrorBoundary from './components/common/ErrorBoundary'
import useScenarioStore from './store/scenarioStore'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const FarmDetail = lazy(() => import('./pages/FarmDetail'))
const FieldAnalysis = lazy(() => import('./pages/FieldAnalysis'))
const SimulationControl = lazy(() => import('./pages/SimulationControl'))
const IrrigationHub = lazy(() => import('./pages/IrrigationHub'))
const SubsidyEngine = lazy(() => import('./pages/SubsidyEngine'))
const CreditScoring = lazy(() => import('./pages/CreditScoring'))
const AdminDemo = lazy(() => import('./pages/AdminDemo'))

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
  const withBoundary = (component, message) => (
    <ErrorBoundary message={message}>
      <Suspense fallback={<Spinner />}>{component}</Suspense>
    </ErrorBoundary>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={withBoundary(<Dashboard />, 'Dashboard section failed to render.')} />
          <Route path="/farms/:farmId" element={withBoundary(<FarmDetail />, 'Farm details failed to render.')} />
          <Route path="/fields/:fieldId" element={withBoundary(<FieldAnalysis />, 'Field analysis failed to render.')} />
          <Route path="/simulation" element={withBoundary(<SimulationControl />, 'Simulation section failed to render.')} />
          <Route path="/irrigation" element={withBoundary(<IrrigationHub />, 'Irrigation section failed to render.')} />
          <Route path="/subsidy" element={withBoundary(<SubsidyEngine />, 'Subsidy section failed to render.')} />
          <Route path="/credit" element={withBoundary(<CreditScoring />, 'Credit scoring section failed to render.')} />
          <Route path="/admin" element={withBoundary(<AdminDemo />, 'Admin section failed to render.')} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
