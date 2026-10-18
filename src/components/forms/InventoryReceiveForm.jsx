import React from 'react'
import { Plus, X } from 'lucide-react'
import InventoryImageAttachments from './InventoryImageAttachments'

export default function InventoryReceiveForm({ form, warehouseOptions, formError, onChange, onAddImage, onRemoveImage, onImageError, onClose, onSubmit }) {
  return <form className="inventory-form" onSubmit={onSubmit}>
    <div className="inventory-form-heading"><div><h2>Receive stock</h2><p>Add a new item or receive more units for an existing SKU.</p></div><button type="button" aria-label="Close add stock form" onClick={onClose}><X size={18}/></button></div>
    <div className="inventory-form-fields">
      <label>Item name<input name="name" value={form.name} onChange={onChange} placeholder="Enter item name" required/></label>
      <label>SKU<input name="sku" value={form.sku} onChange={onChange} placeholder="Enter SKU" required/></label>
      <label>Category<input name="category" value={form.category} onChange={onChange} placeholder="Enter category"/></label>
      <label>Warehouse<select name="warehouse" value={form.warehouse} onChange={onChange} required disabled={!warehouseOptions.length}><option value="" disabled>Select warehouse</option>{warehouseOptions.map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Quantity received<input name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={onChange} placeholder="Enter quantity" required/></label>
      <div className="inventory-form-image-field"><span>Item photos</span><InventoryImageAttachments images={form.images} inputId="new-inventory-images" onAdd={onAddImage} onRemove={onRemoveImage} onError={onImageError}/></div>
    </div>
    {formError && <p className="form-message form-error" role="alert">{formError}</p>}
    <div className="inventory-form-actions"><button type="button" className="btn btn-outline inventory-cancel" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary"><Plus size={16}/>Save Stock</button></div>
  </form>
}
