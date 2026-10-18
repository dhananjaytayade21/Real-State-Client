import React from 'react'
import { Barcode, Search } from 'lucide-react'

export default function BarcodeLookupForm({ code, onChange, onSubmit }) {
  return <form className="barcode-lookup" onSubmit={onSubmit}>
    <label htmlFor="barcode-code"><Barcode size={20}/>Scan or enter item SKU</label>
    <div><input id="barcode-code" value={code} onChange={onChange} placeholder="Enter or scan a SKU" required autoFocus/><button className="btn btn-primary" type="submit"><Search size={15}/>Find item</button></div>
  </form>
}
