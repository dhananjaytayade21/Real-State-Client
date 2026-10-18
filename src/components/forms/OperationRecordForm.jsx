import React from 'react'
import { Save, X } from 'lucide-react'

export default function OperationRecordForm({ title, addLabel, fields, form, formError, editing, onChange, onImageRemove, onCancel, onSubmit }) {
  return <form className="operation-form" onSubmit={onSubmit}>
    <div className="inventory-form-heading"><div><h2>{editing ? `Edit ${title.toLowerCase()} record` : addLabel}</h2><p>Enter the details below, then save to update this workspace.</p></div><button type="button" aria-label="Close form" onClick={onCancel}><X size={18}/></button></div>
    <div className="operation-form-fields">{fields.map(field=><label key={field.key}>{field.label}{field.type === 'image' ? <><input name={field.key} type="file" accept="image/*" onChange={onChange}/>{form[field.key] && <span className="image-upload-preview"><img src={form[field.key]} alt="Selected upload preview"/><button type="button" className="inventory-action-cancel" onClick={()=>onImageRemove(field.key)}>Remove image</button></span>}</> : field.type === 'select' ? <select name={field.key} value={form[field.key] ?? ''} onChange={onChange} required={field.required !== false}><option value="" disabled>{field.options?.length ? 'Select an option' : 'No options available'}</option>{field.options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea name={field.key} value={form[field.key] ?? ''} onChange={onChange} placeholder={field.placeholder || ''} required={field.required !== false} rows="3"/> : <input name={field.key} type={field.type || 'text'} min={field.min} step={field.step} value={form[field.key] ?? ''} onChange={onChange} placeholder={field.placeholder || ''} required={field.required !== false}/>}</label>)}</div>
    {formError && <p className="form-message form-error" role="alert">{formError}</p>}
    <div className="inventory-form-actions"><button type="button" className="btn btn-outline inventory-cancel" onClick={onCancel}>Cancel</button><button type="submit" className="btn btn-primary"><Save size={15}/>{editing ? 'Save Changes' : 'Save'}</button></div>
  </form>
}
