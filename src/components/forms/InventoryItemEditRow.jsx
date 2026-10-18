import React from 'react'
import InventoryImageAttachments from './InventoryImageAttachments'

export default function InventoryItemEditRow({ item, editForm, warehouseOptions, onChange, onAddImage, onRemoveImage, onImageError, onSave, onCancel }) {
  const formId = `edit-inventory-item-${item.id}`
  return <tr>
    <td><div className="inventory-edit-product">
      <input className="inventory-edit-input" form={formId} aria-label="Item name" name="name" value={editForm.name} onChange={onChange} required/>
      <InventoryImageAttachments images={editForm.images} inputId={`edit-inventory-images-${item.id}`} onAdd={onAddImage} onRemove={onRemoveImage} onError={onImageError}/>
    </div></td>
    <td><input className="inventory-edit-input" form={formId} aria-label="SKU" name="sku" value={editForm.sku} onChange={onChange} required/></td>
    <td><input className="inventory-edit-input" form={formId} aria-label="Category" name="category" value={editForm.category} onChange={onChange}/></td>
    <td><select className="inventory-edit-input" form={formId} aria-label="Warehouse" name="warehouse" value={editForm.warehouse} onChange={onChange} required>{Array.from(new Set([...warehouseOptions, editForm.warehouse])).filter(Boolean).map(name => <option key={name}>{name}</option>)}</select></td>
    <td><span className="inventory-quantity">{item.quantity.toLocaleString()}</span></td>
    <td>{item.updatedAt}</td>
    <td><form id={formId} className="inventory-row-actions" onSubmit={onSave}><button type="submit" className="inventory-action-save">Save</button><button type="button" className="inventory-action-cancel" onClick={onCancel}>Cancel</button></form></td>
  </tr>
}
