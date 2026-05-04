import React from 'react'

export default function FieldCard({ fieldName }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-bold">{fieldName}</h3>
    </div>
  )
}
