import React from 'react'
import { Link } from 'react-router-dom'

export default function Sidebar() {
  return (
    <div className="w-64 bg-green-800 text-white flex flex-col">
      <div className="p-4 font-bold text-2xl">AqroSmart</div>
      <nav className="flex-1 p-4 space-y-2">
        <Link to="/" className="block py-2">Dashboard</Link>
        <Link to="/simulation" className="block py-2">Simulations</Link>
        <Link to="/irrigation" className="block py-2">Irrigation</Link>
        <Link to="/subsidy" className="block py-2">Subsidies</Link>
        <Link to="/credit" className="block py-2">Credit Score</Link>
      </nav>
    </div>
  )
}
