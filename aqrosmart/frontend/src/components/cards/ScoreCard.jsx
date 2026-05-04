import React from 'react'

export default function ScoreCard({ score }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-gray-500">Credit Score</h3>
      <p className="text-2xl font-bold text-blue-600">{score}</p>
    </div>
  )
}
