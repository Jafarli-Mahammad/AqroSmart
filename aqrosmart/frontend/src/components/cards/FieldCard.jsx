import React from 'react'

function FieldCard({ fieldName }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-bold">{fieldName}</h3>
    </div>
  )
}

export default React.memo(FieldCard)
