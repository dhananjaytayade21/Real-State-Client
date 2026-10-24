import React, { useState } from 'react'
import { Save } from 'lucide-react'

export default function SettingsForm({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const submit = e => {
    e.preventDefault()
    onSave({ ...form, lowStockThreshold: Number(form.lowStockThreshold) })
  }
  return <form className="operation-form" onSubmit={submit}>
    <div className="inventory-form-heading"><div><h2>Preferences</h2><p>These settings are saved to your account.</p></div></div>
    <div className="operation-form-fields">
      <label>Low stock warning threshold<input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={e=>setForm({...form,lowStockThreshold:e.target.value})}/></label>
      <label>Dashboard density<select value={form.density} onChange={e=>setForm({...form,density:e.target.value})}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
      <label className="settings-toggle"><input type="checkbox" checked={form.showNotifications} onChange={e=>setForm({...form,showNotifications:e.target.checked})}/>Show low stock alerts</label>
    </div>
    <div className="inventory-form-actions"><button className="btn btn-primary" type="submit"><Save size={15}/>Save Settings</button></div>
  </form>
}
