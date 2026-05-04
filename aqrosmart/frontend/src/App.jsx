import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/farm/:id" element={<FarmDetail />} />
              <Route path="/field/:id" element={<FieldAnalysis />} />
              <Route path="/simulation" element={<SimulationControl />} />
              <Route path="/irrigation" element={<IrrigationHub />} />
              <Route path="/subsidy" element={<SubsidyEngine />} />
              <Route path="/credit" element={<CreditScoring />} />
              <Route path="/admin" element={<AdminDemo />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
