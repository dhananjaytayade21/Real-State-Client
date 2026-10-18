import React, { useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bell, Box, Boxes, Building2, CalendarDays, ChartNoAxesCombined,
  CheckCircle2, ChevronDown, PanelLeftClose, PanelLeftOpen, CircleHelp, ClipboardList, Clock3, Eye,
  EyeOff, Forklift, Heart, House, KeyRound, LayoutDashboard, LockKeyhole,
  LogOut, Mail, MapPin, Menu, MessageSquare, Moon, Package, Phone, Search, Sun,
  Minus, Pencil, Plus, Save, Settings, ShieldCheck, Truck, User, UserRoundPlus, Users, Warehouse,
  X, Barcode, BadgeCheck, FileText
} from 'lucide-react'

const warehouseImage = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=85'
const warehouseWide = 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?auto=format&fit=crop&w=1400&q=85'
const apartmentImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85'
const officeImage = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85'
const storageImage = 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1000&q=85'
const homeImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85'
const usernameStorageKey = 'wmsRentalsUsername'
const themeStorageKey = 'wmsRentalsTheme'
const profileStorageKeys = {
  name: 'wmsRentalsProfileName',
  email: 'wmsRentalsProfileEmail',
  phone: 'wmsRentalsProfilePhone',
  address: 'wmsRentalsProfileAddress',
}
const inventoryStorageKey = 'wmsRentalsInventory'
const operationStorageKeys = {
  listings: 'wmsRentalsListings',
  movements: 'wmsRentalsMovements',
  orders: 'wmsRentalsOrders',
  bookings: 'wmsRentalsBookings',
  favorites: 'wmsRentalsFavorites',
  messages: 'wmsRentalsMessages',
  settings: 'wmsRentalsSettings',
  warehouses: 'wmsRentalsWarehouses',
}
const readStoredList = key => JSON.parse(localStorage.getItem(key) || '[]')
const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
const getInventoryImages = item => Array.isArray(item.images) ? item.images : item.image ? [item.image] : []
const imageFileToDataUrl = file => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Choose an image file.'))
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    reject(new Error('Choose an image smaller than 10 MB.'))
    return
  }
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('The selected image could not be read.'))
  reader.onload = () => {
    const image = new Image()
    image.onerror = () => reject(new Error('The selected image could not be processed.'))
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Image processing is not available in this browser.'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78)
      if (dataUrl.length > 2 * 1024 * 1024) {
        reject(new Error('The image is too large to save in browser storage. Choose a smaller image.'))
        return
      }
      resolve(dataUrl)
    }
    image.src = reader.result
  }
  reader.readAsDataURL(file)
})
const formatRecordDate = value => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function Brand({ light = false, to = '/', onClick }) {
  return <Link to={to} onClick={onClick} className={`brand ${light ? 'brand-light' : ''}`}>
    <span className="brand-mark"><Box size={30} strokeWidth={2.7} /></span>
    <span><strong>WMS<span>Rentals</span></strong><small>Store More&nbsp; | &nbsp;Rent Smarter</small></span>
  </Link>
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className="site-header">
    <Brand />
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
    <nav className={open ? 'nav-links nav-open' : 'nav-links'}>
      <NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink>
      <a href="/#warehouse" onClick={() => setOpen(false)}>Warehouse</a>
      <a href="/#rentals" onClick={() => setOpen(false)}>Rental</a>
      <a href="/#about" onClick={() => setOpen(false)}>About</a>
      <a href="/#contact" onClick={() => setOpen(false)}>Contact</a>
    </nav>
    <div className="header-actions"><Search size={19} /><Link className="btn btn-outline" to="/login">Login</Link><Link className="btn btn-primary" to="/signup">Sign Up</Link></div>
  </header>
}

const featureItems = [
  { icon: Warehouse, title: 'Inventory Tracking', text: 'Real-time stock visibility and control.' },
  { icon: Truck, title: 'Order Management', text: 'Streamlined inbound and outbound operations.' },
  { icon: ChartNoAxesCombined, title: 'Analytics & Reports', text: 'Make data-driven decisions.' },
  { icon: House, title: 'Verified Listings', text: 'Trusted and verified rental properties.' },
  { icon: ShieldCheck, title: 'Secure Transactions', text: 'Safe and hassle-free payments.' },
  { icon: Users, title: 'Easy Communication', text: 'Connect with owners and tenants directly.' },
]
function ListingCard({ item, compact = false, saved: savedValue, onToggleFavorite }) {
  const [saved, setSaved] = useState(false)
  const isSaved = savedValue === undefined ? saved : savedValue
  return <article className={`listing-card ${compact ? 'listing-compact' : ''}`}>
    <div className="listing-image">{item.image ? <img src={item.image} alt={item.name} /> : <div className="listing-image-placeholder"><Building2 size={25}/></div>}<span className={`pill pill-${(item.type || '').toLowerCase()}`}>{item.type}</span><button className={`heart-btn ${isSaved ? 'saved' : ''}`} onClick={() => onToggleFavorite ? onToggleFavorite(item.id) : setSaved(!saved)} aria-label={isSaved ? 'Remove saved listing' : 'Save listing'}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
    <div className="listing-body"><strong>{item.name}</strong><p className="muted"><MapPin size={13} />{item.city}</p><div className="listing-meta"><span><Building2 size={13} />{item.size}</span><span>{item.price}</span></div></div>
  </article>
}

function Home() {
  const [listings] = useState(() => readStoredList(operationStorageKeys.listings))
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem(operationStorageKeys.favorites) || '[]'))
  const toggleFavorite = id => {
    const updated = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id]
    localStorage.setItem(operationStorageKeys.favorites, JSON.stringify(updated))
    setFavorites(updated)
  }
  return <><Header />
    <main>
      <section className="split-hero">
        <div className="hero-panel warehouse-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(5,21,39,.8),rgba(5,21,39,.1)),url(${warehouseImage})` }}>
          <div className="hero-copy"><span className="eyebrow">WAREHOUSE MANAGEMENT SYSTEM</span><h1>Smarter Inventory.<br />Higher Efficiency.</h1><p>Manage your warehouse operations with ease.<br />Track, store, move and deliver — all in one place.</p><div className="hero-buttons"><a className="btn btn-primary" href="#warehouse">Explore WMS <ArrowRight size={17} /></a><a className="btn btn-glass" href="/login">Watch Demo <span>▶</span></a></div></div>
        </div>
        <div className="hero-panel rental-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(5,21,39,.6),rgba(5,21,39,.08)),url(${homeImage})` }}>
          <div className="hero-copy"><span className="eyebrow">RENTAL PORTAL</span><h1>Find Your Perfect<br />Space. Easily.</h1><p>Browse verified rental properties, warehouses,<br />and commercial spaces. Rent with confidence.</p><div className="hero-buttons"><a className="btn btn-green" href="#rentals">Browse Rentals <ArrowRight size={17} /></a><Link className="btn btn-glass" to="/signup">List Your Property <House size={16} /></Link></div></div>
        </div>
      </section>
      <section className="features">{featureItems.map(({icon: Icon,title,text}) => <div className="feature" key={title}><Icon size={34} strokeWidth={1.8}/><strong>{title}</strong><p>{text}</p></div>)}</section>
      <section className="promo-grid content-width" id="about">
        <article className="promo-card promo-blue" id="warehouse"><img src={warehouseImage} alt="Warehouse shelves" /><div><span className="eyebrow blue-text">WAREHOUSE MANAGEMENT SYSTEM</span><h2>Take Control of Your<br />Supply Chain</h2><p>Our WMS helps you optimize space, reduce errors, and improve productivity with real-time tracking and automation.</p><ul><li><CheckCircle2 />Stock & lot tracking</li><li><CheckCircle2 />Barcode / RFID support</li><li><CheckCircle2 />Multi-warehouse management</li><li><CheckCircle2 />Inventory & order reports</li></ul><Link className="btn btn-primary" to="/dashboard">Get Started <ArrowRight size={16}/></Link></div></article>
        <article className="promo-card promo-green" id="rentals"><img src={apartmentImage} alt="Modern rental property" /><div><span className="eyebrow green-text">RENTAL PORTAL</span><h2>Discover Great<br />Rental Opportunities</h2><p>Whether you're looking for a home, office, warehouse or commercial space — our rental portal makes it simple, safe and fast.</p><ul><li><CheckCircle2 />Residential & commercial properties</li><li><CheckCircle2 />Warehouse & industrial spaces</li><li><CheckCircle2 />Flexible rental terms</li><li><CheckCircle2 />Direct owner-to-tenant connection</li></ul><a className="btn btn-green" href="#popular">Browse Rentals <ArrowRight size={16}/></a></div></article>
      </section>
      <section className="popular-section" id="popular"><div className="content-width"><div className="section-heading"><div><span className="eyebrow blue-text">FEATURED</span><h2>Popular Listings</h2></div><Link to="/dashboard" className="section-action">Manage Listings <ArrowRight size={15}/></Link></div>{listings.length ? <div className="listing-grid">{listings.map(item => <ListingCard item={item} key={item.id} saved={favorites.includes(item.id)} onToggleFavorite={toggleFavorite}/>)}</div> : <p className="home-empty-listings">No properties are listed yet. Sign in to add the first rental listing.</p>}</div></section>
    </main>
    <footer className="site-footer" id="contact"><Brand light/><nav><a href="/">Home</a><a href="#warehouse">Warehouse</a><a href="#rentals">Rental</a><a href="#about">About</a><a href="#contact">Contact</a></nav><span>© 2026 WMSRentals. All rights reserved.</span></footer>
  </>
}

const menuGroups = [
  { title: 'Dashboard', icon: LayoutDashboard, items: [] },
  { title: 'Warehouse Management', icon: Warehouse, items: ['Warehouses','Inventory','Stock Movements','Orders','Barcode / RFID','Reports'] },
  { title: 'Rental Portal', icon: House, items: ['Browse Rentals','My Bookings','Favorites','Messages'] },
]

function ProfilePanel({ profile, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)

  const update = e => setForm({ ...form, [e.target.name]: e.target.value })
  const cancelEdit = () => {
    setForm(profile)
    setEditing(false)
    setSaved(false)
  }
  const submit = e => {
    e.preventDefault()
    const updatedProfile = {
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    }
    onSave(updatedProfile)
    setForm(updatedProfile)
    setEditing(false)
    setSaved(true)
  }

  return <section className="profile-page">
    <div className="profile-page-heading">
      <div><span className="eyebrow blue-text">ACCOUNT</span><h1>My Profile</h1><p>View and manage your personal information.</p></div>
      {!editing && <button type="button" className="btn btn-primary" onClick={() => { setSaved(false); setEditing(true) }}><Pencil size={16}/>Edit Profile</button>}
    </div>
    {saved && <div className="profile-saved" role="status"><CheckCircle2 size={17}/>Profile details saved.</div>}
    <article className="profile-card">
      <div className="profile-card-heading">
        <span className="profile-avatar">{(profile.name || profile.username || 'U').charAt(0).toUpperCase()}</span>
        <div><h2>{profile.name || profile.username}</h2><p>@{profile.username}</p></div>
        <span className="profile-status"><BadgeCheck size={15}/>Account</span>
      </div>
      {editing ? <form className="profile-form" onSubmit={submit}>
        <label>Full Name<input name="name" value={form.name} onChange={update} autoComplete="name" required/></label>
        <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required/></label>
        <label>Email Address<input name="email" type="email" value={form.email} onChange={update} autoComplete="email"/></label>
        <label>Mobile Number<input name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel"/></label>
        <label>Address<textarea name="address" value={form.address} onChange={update} autoComplete="street-address" rows="3"/></label>
        <div className="profile-form-actions"><button type="button" className="btn btn-outline profile-cancel" onClick={cancelEdit}><X size={16}/>Cancel</button><button type="submit" className="btn btn-primary"><Save size={16}/>Save Changes</button></div>
      </form> : <div className="profile-details">
        <div><span><User size={17}/>Full Name</span><strong>{profile.name || 'Not provided'}</strong></div>
        <div><span><User size={17}/>Username</span><strong>{profile.username || 'Not provided'}</strong></div>
        <div><span><Mail size={17}/>Email Address</span><strong>{profile.email || 'Not provided'}</strong></div>
        <div><span><Phone size={17}/>Mobile Number</span><strong>{profile.phone || 'Not provided'}</strong></div>
        <div><span><MapPin size={17}/>Address</span><strong>{profile.address || 'Not provided'}</strong></div>
      </div>}
    </article>
  </section>
}

function InventoryImageAttachments({ images, onAdd, onRemove, onError, inputId }) {
  const [processing, setProcessing] = useState(false)
  const addFiles = async e => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setProcessing(true)
    try {
      for (const file of files) {
        try {
          onAdd(await imageFileToDataUrl(file))
        } catch (error) {
          onError(error.message)
          break
        }
      }
    } finally {
      setProcessing(false)
    }
  }
  return <div className="inventory-image-attachments">
    <input id={inputId} type="file" accept="image/*" multiple onChange={addFiles} disabled={processing}/>
    <label className="inventory-image-add" htmlFor={inputId}><Plus size={14}/>{processing ? 'Adding photos…' : 'Add photos'}</label>
    <span className="inventory-image-hint">Choose one or more images; they are added one at a time.</span>
    {images.length > 0 && <div className="inventory-image-previews">{images.map((image, index) => <div className="inventory-image-preview" key={`${index}-${image.slice(0, 32)}`}>
      <img src={image} alt={`Item photo ${index + 1}`}/>
      <button type="button" className="inventory-action-cancel" aria-label={`Remove photo ${index + 1}`} disabled={processing} onClick={() => onRemove(index)}>Remove</button>
    </div>)}</div>}
  </div>
}

function InventoryPanel({ items, warehouseOptions, search, addStockOpen, onOpenAddStock, onReceiveStock, onCloseAddStock, onUpdateItem, onAdjustQuantity, onDeleteItem, onCreateWarehouse }) {
  const emptyForm = () => ({ name: '', sku: '', category: '', warehouse: warehouseOptions[0] || '', quantity: '', images: [] })
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [formError, setFormError] = useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = items.filter(item =>
    `${item.name} ${item.sku} ${item.category} ${item.warehouse}`.toLowerCase().includes(normalizedSearch)
  )
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0)

  const update = e => {
    const { name, value } = e.target
    setForm(current => ({ ...current, [name]: value }))
  }
  const updateEditForm = e => {
    const { name, value } = e.target
    setEditForm(current => ({ ...current, [name]: value }))
  }
  const startEditing = item => {
    setEditingId(item.id)
    setEditForm({ name: item.name, sku: item.sku, category: item.category, warehouse: item.warehouse, images: getInventoryImages(item) })
  }
  const saveEdit = e => {
    e.preventDefault()
    const updated = { ...editForm, name: editForm.name.trim(), sku: editForm.sku.trim().toUpperCase(), category: editForm.category.trim() || 'Uncategorized' }
    if (onUpdateItem(editingId, updated)) {
      setEditingId(null)
      setEditForm(null)
    }
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }
  const submit = e => {
    e.preventDefault()
    const saved = onReceiveStock({
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim() || 'Uncategorized',
      warehouse: form.warehouse,
      quantity: Number(form.quantity),
      images: form.images,
    })
    if (saved !== false) {
      setForm(emptyForm())
      setFormError('')
    }
  }

  return <section className="inventory-page">
    <div className="inventory-heading">
      <div><span className="eyebrow blue-text">WAREHOUSE MANAGEMENT</span><h1>Inventory</h1><p>Track stock levels across your warehouses.</p></div>
      {!addStockOpen && <button type="button" className="btn btn-primary" disabled={!warehouseOptions.length} onClick={onOpenAddStock}><Plus size={17}/>Add Stock</button>}
    </div>
    <div className="inventory-summary">
      <article><span><Package size={19}/></span><div><small>Stock items</small><strong>{items.length}</strong></div></article>
      <article><span><Boxes size={19}/></span><div><small>Total units</small><strong>{totalUnits.toLocaleString()}</strong></div></article>
      <article><span><Warehouse size={19}/></span><div><small>Warehouses</small><strong>{new Set(items.map(item => item.warehouse)).size}</strong></div></article>
    </div>
    {!warehouseOptions.length && <div className="notice"><Warehouse size={17}/>Add a warehouse before receiving stock.<button type="button" className="inventory-edit-button" onClick={onCreateWarehouse}>Create warehouse</button></div>}
    {addStockOpen && <form className="inventory-form" onSubmit={submit}>
      <div className="inventory-form-heading"><div><h2>Receive stock</h2><p>Add a new item or receive more units for an existing SKU.</p></div><button type="button" aria-label="Close add stock form" onClick={onCloseAddStock}><X size={18}/></button></div>
      <div className="inventory-form-fields">
        <label>Item name<input name="name" value={form.name} onChange={update} placeholder="Enter item name" required/></label>
        <label>SKU<input name="sku" value={form.sku} onChange={update} placeholder="Enter SKU" required/></label>
        <label>Category<input name="category" value={form.category} onChange={update} placeholder="Enter category"/></label>
        <label>Warehouse<select name="warehouse" value={form.warehouse} onChange={update} required disabled={!warehouseOptions.length}><option value="" disabled>Select warehouse</option>{warehouseOptions.map(name=><option key={name}>{name}</option>)}</select></label>
        <label>Quantity received<input name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={update} placeholder="Enter quantity" required/></label>
        <div className="inventory-form-image-field"><span>Item photos</span><InventoryImageAttachments images={form.images} inputId="new-inventory-images" onAdd={image => {setForm(current => ({...current, images: [...current.images, image]}));setFormError('')}} onRemove={index => {setForm(current => ({...current, images: current.images.filter((_, imageIndex) => imageIndex !== index)}));setFormError('')}} onError={setFormError}/></div>
      </div>
      {formError && <p className="form-message form-error" role="alert">{formError}</p>}
      <div className="inventory-form-actions"><button type="button" className="btn btn-outline inventory-cancel" onClick={onCloseAddStock}>Cancel</button><button type="submit" className="btn btn-primary"><Plus size={16}/>Save Stock</button></div>
    </form>}
    <section className="inventory-table-card">
      <div className="inventory-table-heading"><div><h2>Stock list</h2><p>{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</p></div><span><Search size={16}/>{search || 'All inventory'}</span></div>
      {formError && !addStockOpen && <p className="form-message form-error" role="alert">{formError}</p>}
      {filteredItems.length ? <div className="inventory-table-scroll">
        <table className="inventory-table">
          <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Warehouse</th><th>Quantity</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>{filteredItems.map(item => <tr key={item.id}>
            {editingId === item.id ? <>
              <td><div className="inventory-edit-product">
                <input className="inventory-edit-input" aria-label="Item name" name="name" value={editForm.name} onChange={updateEditForm} required/>
                <InventoryImageAttachments images={editForm.images} inputId={`edit-inventory-images-${item.id}`} onAdd={image => {setEditForm(current => ({...current, images: [...current.images, image]}));setFormError('')}} onRemove={index => {setEditForm(current => ({...current, images: current.images.filter((_, imageIndex) => imageIndex !== index)}));setFormError('')}} onError={setFormError}/>
              </div></td>
              <td><input className="inventory-edit-input" aria-label="SKU" name="sku" value={editForm.sku} onChange={updateEditForm} required/></td>
              <td><input className="inventory-edit-input" aria-label="Category" name="category" value={editForm.category} onChange={updateEditForm}/></td>
              <td><select className="inventory-edit-input" aria-label="Warehouse" name="warehouse" value={editForm.warehouse} onChange={updateEditForm} required>{Array.from(new Set([...warehouseOptions, editForm.warehouse])).filter(Boolean).map(name => <option key={name}>{name}</option>)}</select></td>
              <td><span className="inventory-quantity">{item.quantity.toLocaleString()}</span></td>
              <td>{item.updatedAt}</td>
              <td><form className="inventory-row-actions" onSubmit={saveEdit}><button type="submit" className="inventory-action-save">Save</button><button type="button" className="inventory-action-cancel" onClick={cancelEdit}>Cancel</button></form></td>
            </> : <>
              <td><div className="inventory-product-cell">{getInventoryImages(item).length > 0 && <span className="inventory-photo-count"><img className="inventory-item-thumb" src={getInventoryImages(item)[0]} alt=""/>{getInventoryImages(item).length > 1 && <small>+{getInventoryImages(item).length - 1}</small>}</span>}<strong>{item.name}</strong></div></td>
              <td><span className="inventory-sku">{item.sku}</span></td>
              <td>{item.category}</td>
              <td>{item.warehouse}</td>
              <td><div className="inventory-quantity-control"><button type="button" aria-label={`Decrease ${item.name} quantity`} title="Decrease quantity" disabled={item.quantity <= 0} onClick={() => onAdjustQuantity(item.id, -1)}><Minus size={13}/></button><span className="inventory-quantity">{item.quantity.toLocaleString()}</span><button type="button" aria-label={`Increase ${item.name} quantity`} title="Increase quantity" onClick={() => onAdjustQuantity(item.id, 1)}><Plus size={13}/></button></div></td>
              <td>{item.updatedAt}</td>
              <td><div className="inventory-row-actions"><button type="button" className="inventory-edit-button" onClick={() => startEditing(item)}><Pencil size={13}/>Edit</button><button type="button" className="inventory-action-cancel" onClick={() => onDeleteItem(item.id)}>Delete</button></div></td>
            </>}
          </tr>)}</tbody>
        </table>
      </div> : <div className="inventory-empty"><Package size={26}/><strong>No stock items found</strong><p>{search ? 'Try a different search.' : 'Add stock to get your inventory started.'}</p></div>}
    </section>
  </section>
}

function OperationPanel({ title, description, records, fields, onSave, onDelete, search, addLabel = 'Add record', emptyMessage, autoOpen = false, disableAdd = false, renderActions, immutable = false }) {
  const [formOpen, setFormOpen] = useState(autoOpen)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = records.filter(record =>
    fields.map(field => record[field.key]).join(' ').toLowerCase().includes(normalizedSearch)
  )
  const blankForm = () => Object.fromEntries(fields.map(field => [field.key, field.defaultValue ?? field.options?.[0]?.value ?? '']))
  const startCreate = () => {
    setForm(blankForm())
    setEditingId(null)
    setFormOpen(true)
  }
  const startEdit = record => {
    setForm(Object.fromEntries(fields.map(field => [field.key, record[field.key] ?? ''])))
    setEditingId(record.id)
    setFormOpen(true)
  }
  const cancel = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm({})
    setFormError('')
  }
  const submit = e => {
    e.preventDefault()
    if (onSave({ ...form, id: editingId })) cancel()
  }
  const update = async e => {
    const { name, type, files, value } = e.target
    if (type === 'file') {
      const file = files?.[0]
      if (!file) return
      try {
        const image = await imageFileToDataUrl(file)
        setForm(current => ({ ...current, [name]: image }))
        setFormError('')
      } catch (error) {
        setFormError(error.message)
      }
      e.target.value = ''
      return
    }
    setForm(current => ({ ...current, [name]: value }))
  }

  return <section className="operation-page">
    <div className="operation-heading">
      <div><span className="eyebrow blue-text">OPERATIONS</span><h1>{title}</h1><p>{description}</p></div>
      {!formOpen && <button type="button" className="btn btn-primary" disabled={disableAdd} title={disableAdd ? 'Create the required records first.' : undefined} onClick={startCreate}><Plus size={16}/>{addLabel}</button>}
    </div>
    {formOpen && <form className="operation-form" onSubmit={submit}>
      <div className="inventory-form-heading"><div><h2>{editingId ? `Edit ${title.toLowerCase()} record` : addLabel}</h2><p>Enter the details below, then save to update this workspace.</p></div><button type="button" aria-label="Close form" onClick={cancel}><X size={18}/></button></div>
      <div className="operation-form-fields">{fields.map(field=><label key={field.key}>{field.label}{field.type === 'image' ? <><input name={field.key} type="file" accept="image/*" onChange={update}/>{form[field.key] && <span className="image-upload-preview"><img src={form[field.key]} alt="Selected upload preview"/><button type="button" className="inventory-action-cancel" onClick={()=>setForm(current=>({...current,[field.key]:''}))}>Remove image</button></span>}</> : field.type === 'select' ? <select name={field.key} value={form[field.key] ?? ''} onChange={update} required={field.required !== false}><option value="" disabled>{field.options?.length ? 'Select an option' : 'No options available'}</option>{field.options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea name={field.key} value={form[field.key] ?? ''} onChange={update} placeholder={field.placeholder || ''} required={field.required !== false} rows="3"/> : <input name={field.key} type={field.type || 'text'} min={field.min} step={field.step} value={form[field.key] ?? ''} onChange={update} placeholder={field.placeholder || ''} required={field.required !== false}/>}</label>)}</div>
      {formError && <p className="form-message form-error" role="alert">{formError}</p>}
      <div className="inventory-form-actions"><button type="button" className="btn btn-outline inventory-cancel" onClick={cancel}>Cancel</button><button type="submit" className="btn btn-primary"><Save size={15}/>{editingId ? 'Save Changes' : 'Save'}</button></div>
    </form>}
    <section className="inventory-table-card">
      <div className="inventory-table-heading"><div><h2>{title} records</h2><p>{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</p></div><span><Search size={16}/>{search || 'All records'}</span></div>
      {filtered.length ? <div className="inventory-table-scroll">
        <table className="inventory-table">
          <thead><tr>{fields.map(field => <th key={field.key}>{field.label}</th>)}{immutable && <th>Recorded</th>}<th>Actions</th></tr></thead>
          <tbody>{filtered.map(record => <tr key={record.id}>
            {fields.map(field => <td key={field.key}>{field.type === 'image' ? record[field.key] ? <img className="inventory-item-thumb" src={record[field.key]} alt={`${record.name || title} image`}/> : '—' : field.options?.find(option => option.value === record[field.key])?.label || record[field.key] || '—'}</td>)}
            {immutable && <td>{record.createdAt}</td>}
            <td><div className="inventory-row-actions">
              {!immutable && <>{renderActions?.(record)}<button type="button" className="inventory-edit-button" onClick={() => startEdit(record)}><Pencil size={13}/>Edit</button></>}
              <button type="button" className="inventory-action-cancel" onClick={() => onDelete(record.id)}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="inventory-empty"><ClipboardList size={26}/><strong>{emptyMessage || `No ${title.toLowerCase()} records yet`}</strong><p>Use “{addLabel}” to create your first record.</p></div>}
    </section>
  </section>
}

function BarcodePanel({ inventory, onAdjustQuantity, search }) {
  const [code, setCode] = useState('')
  const [scanned, setScanned] = useState(null)
  const lookup = e => {
    e.preventDefault()
    setScanned(inventory.find(item => item.sku.toLowerCase() === code.trim().toLowerCase()) || false)
  }
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = inventory.filter(item => `${item.name} ${item.sku} ${item.warehouse}`.toLowerCase().includes(normalizedSearch))
  return <section className="operation-page">
    <div className="operation-heading"><div><span className="eyebrow blue-text">WAREHOUSE MANAGEMENT</span><h1>Barcode / RFID</h1><p>Look up a stock item by SKU or barcode and adjust its on-hand quantity.</p></div></div>
    <form className="barcode-lookup" onSubmit={lookup}><label htmlFor="barcode-code"><Barcode size={20}/>Scan or enter item SKU</label><div><input id="barcode-code" value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter or scan a SKU" required autoFocus/><button className="btn btn-primary" type="submit"><Search size={15}/>Find item</button></div></form>
    {scanned && <div className="barcode-result"><div><small>Matched item</small><strong>{scanned.name} · {scanned.sku}</strong><span>{scanned.warehouse} · {scanned.quantity} units</span></div><div><button type="button" className="btn btn-outline" disabled={scanned.quantity <= 0} onClick={()=>{onAdjustQuantity(scanned.id,-1);setScanned(current=>({...current,quantity:Math.max(0,current.quantity-1)}))}}><Minus size={14}/>Remove 1</button><button type="button" className="btn btn-primary" onClick={()=>{onAdjustQuantity(scanned.id,1);setScanned(current=>({...current,quantity:current.quantity+1}))}}><Plus size={14}/>Add 1</button></div></div>}
    {scanned === false && <div className="notice barcode-notice"><CircleHelp size={17}/>No inventory item matches “{code}”.</div>}
    <section className="inventory-table-card"><div className="inventory-table-heading"><div><h2>Available inventory</h2><p>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</p></div><span><Search size={16}/>{search || 'All inventory'}</span></div>{filtered.length ? <div className="inventory-table-scroll"><table className="inventory-table"><thead><tr><th>Item</th><th>SKU / Barcode</th><th>Warehouse</th><th>On hand</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id}><td>{item.name}</td><td><span className="inventory-sku">{item.sku}</span></td><td>{item.warehouse}</td><td>{item.quantity}</td></tr>)}</tbody></table></div>:<div className="inventory-empty"><Package size={26}/><strong>No inventory available</strong><p>Add stock in Inventory before scanning.</p></div>}</section>
  </section>
}

function FavoritesPanel({ listings, favoriteIds, onToggleFavorite }) {
  const favorites = listings.filter(item => favoriteIds.includes(item.id))
  return <section className="operation-page"><div className="operation-heading"><div><span className="eyebrow green-text">RENTAL PORTAL</span><h1>Favorites</h1><p>Saved rental listings for quick access.</p></div></div>
    {favorites.length ? <div className="favorite-grid">{favorites.map(item=><article className="favorite-card" key={item.id}><div><span>{item.type}</span><h2>{item.name}</h2><p>{item.city} · {item.size}</p><strong>{item.price}</strong></div><button type="button" className="btn btn-outline" onClick={()=>onToggleFavorite(item.id)}><Heart size={15} fill="currentColor"/>Remove favorite</button></article>)}</div> : <div className="inventory-empty operation-empty"><Heart size={27}/><strong>No favorites saved</strong><p>Open Browse Rentals and save a listing to see it here.</p></div>}
  </section>
}

function ReportsPanel({ inventory, movements, orders, listings, bookings }) {
  const exportReport = () => {
    const rows = [['Type','Name','SKU','Warehouse','Quantity'], ...inventory.map(item=>['Inventory',item.name,item.sku,item.warehouse,item.quantity])]
    const csv = rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  const metrics = [
    ['Stock items', inventory.length, Package],
    ['Units on hand', inventory.reduce((sum,item)=>sum+item.quantity,0).toLocaleString(), Boxes],
    ['Stock movements', movements.length, Truck],
    ['Orders', orders.length, ClipboardList],
    ['Rental listings', listings.length, House],
    ['Bookings', bookings.length, CalendarDays],
  ]
  return <section className="operation-page"><div className="operation-heading"><div><span className="eyebrow blue-text">WAREHOUSE MANAGEMENT</span><h1>Reports</h1><p>Live summaries generated from your browser-stored operations data.</p></div><button type="button" className="btn btn-primary" onClick={exportReport}><FileText size={15}/>Export inventory CSV</button></div><div className="report-grid">{metrics.map(([label,value,Icon])=><article className="report-card" key={label}><Icon size={20}/><span>{label}</span><strong>{value}</strong></article>)}</div><div className="inventory-table-card"><div className="inventory-table-heading"><div><h2>Current stock report</h2><p>{inventory.length} item rows</p></div></div>{inventory.length ? <div className="inventory-table-scroll"><table className="inventory-table"><thead><tr><th>Item</th><th>SKU</th><th>Warehouse</th><th>Quantity</th><th>Category</th></tr></thead><tbody>{inventory.map(item=><tr key={item.id}><td>{item.name}</td><td>{item.sku}</td><td>{item.warehouse}</td><td>{item.quantity}</td><td>{item.category}</td></tr>)}</tbody></table></div>:<div className="inventory-empty"><FileText size={26}/><strong>No report data yet</strong><p>Stock and activity reports appear when you record operations.</p></div>}</div></section>
}

function SettingsPanel({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const submit = e => {
    e.preventDefault()
    onSave({ ...form, lowStockThreshold: Number(form.lowStockThreshold) })
  }
  return <section className="operation-page"><div className="operation-heading"><div><span className="eyebrow blue-text">ACCOUNT</span><h1>Settings</h1><p>Set dashboard and inventory preferences for this browser.</p></div></div><form className="operation-form" onSubmit={submit}><div className="inventory-form-heading"><div><h2>Preferences</h2><p>These settings are stored locally in this browser.</p></div></div><div className="operation-form-fields"><label>Low stock warning threshold<input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={e=>setForm({...form,lowStockThreshold:e.target.value})}/></label><label>Dashboard density<select value={form.density} onChange={e=>setForm({...form,density:e.target.value})}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label className="settings-toggle"><input type="checkbox" checked={form.showNotifications} onChange={e=>setForm({...form,showNotifications:e.target.checked})}/>Show low stock alerts</label></div><div className="inventory-form-actions"><button className="btn btn-primary" type="submit"><Save size={15}/>Save Settings</button></div></form><div className="inventory-table-card settings-info"><h2>Data storage</h2><p>Inventory, listings, bookings, orders, messages, and settings are saved to this browser only. They are not synced to other devices.</p></div></section>
}

function DashboardOverview({ username, inventory, warehouses, listings, bookings, movements, lowStockItems, onNavigate, onQuickAction }) {
  const totalUnits = inventory.reduce((total, item) => total + item.quantity, 0)
  const metrics = [
    { label: 'Warehouses', value: warehouses.length, icon: Warehouse, color: 'blue', page: 'Warehouses' },
    { label: 'Stock items', value: inventory.length, icon: Package, color: 'green', page: 'Inventory' },
    { label: 'Bookings', value: bookings.length, icon: FileText, color: 'purple', page: 'My Bookings' },
    { label: 'Rental listings', value: listings.length, icon: House, color: 'orange', page: 'Browse Rentals' },
  ]
  return <>
    <section className="dash-welcome" style={{backgroundImage:`linear-gradient(90deg,rgba(6,27,49,.88),rgba(6,27,49,.08)),url(${warehouseImage})`}}><div><h1>Welcome Back{username ? `, ${username}` : ''}!</h1><p>Your workspace overview is based on records you add.</p><small>{totalUnits.toLocaleString()} units currently recorded</small></div></section>
    <section className="stats-grid">{metrics.map(metric=><button className={`stat-card stat-${metric.color}`} key={metric.label} onClick={()=>onNavigate(metric.page)}><metric.icon size={30}/><div><span>{metric.label}</span><strong>{metric.value}</strong><small>Open {metric.page} <ArrowRight size={12}/></small></div></button>)}</section>
    <div className="dashboard-columns">
      <section className="dash-panel warehouse-overview"><div className="panel-heading"><h3><Warehouse size={19}/>Warehouses</h3><button type="button" onClick={()=>onNavigate('Warehouses')}>Manage →</button></div>{warehouses.length ? warehouses.map(warehouse=>{const warehouseItems=inventory.filter(item=>item.warehouse===warehouse.name);const units=warehouseItems.reduce((sum,item)=>sum+item.quantity,0);return <div className="warehouse-row warehouse-row-simple" key={warehouse.id}><div className="warehouse-info"><strong>{warehouse.name}</strong><p className="muted"><MapPin size={13}/>{warehouse.location}</p><div className="mini-stats"><span>Items<strong>{warehouseItems.length}</strong></span><span>Units<strong>{units}</strong></span><span>Capacity<strong>{warehouse.capacity}</strong></span></div><button type="button" className="btn btn-primary btn-small" onClick={()=>onNavigate('Inventory')}>View Inventory <ArrowRight size={13}/></button></div></div>}) : <div className="inventory-empty"><Warehouse size={24}/><strong>No warehouses added</strong><button type="button" className="inventory-edit-button" onClick={()=>onNavigate('Warehouses')}>Add a warehouse</button></div>}</section>
      <section className="dash-panel rental-overview"><div className="panel-heading"><h3><House size={19}/>Rental Listings</h3><button type="button" onClick={()=>onNavigate('Browse Rentals')}>Manage →</button></div>{listings.length ? listings.slice(0,4).map(item=><div className="rental-row" key={item.id}><div className="rental-placeholder">{item.image ? <img src={item.image} alt={item.name}/> : <House size={20}/>}</div><div><span className="for-rent">{item.type}</span><strong>{item.name}</strong><p className="muted"><MapPin size={12}/>{item.city}</p><b>{item.price}</b></div><button type="button" className="btn btn-outline btn-small" onClick={()=>onNavigate('Browse Rentals')}>Manage</button></div>) : <div className="inventory-empty"><House size={24}/><strong>No listings created</strong><button type="button" className="inventory-edit-button" onClick={()=>onNavigate('Browse Rentals')}>Add a listing</button></div>}</section>
      <section className="dash-panel top-properties"><div className="panel-heading"><h3><ChartNoAxesCombined size={19}/>Inventory snapshot</h3><button type="button" onClick={()=>onNavigate('Reports')}>View Reports →</button></div>{inventory.length ? <div className="dashboard-stock-list">{inventory.slice(0,5).map(item=><div key={item.id}><span><strong>{item.name}</strong><small>{item.sku} · {item.warehouse}</small></span><b>{item.quantity} units</b></div>)}</div> : <div className="inventory-empty"><Package size={24}/><strong>No inventory recorded</strong><button type="button" className="inventory-edit-button" onClick={()=>onQuickAction('Add Stock / Receive')}>Add stock</button></div>}</section>
    </div>
    <div className="dashboard-data-summary"><span>{movements.length} stock movements</span><span>{lowStockItems.length} items below the alert threshold</span></div>
  </>
}

function WorkspaceSearchPanel({ query, collections, onSelect }) {
  const normalizedQuery = query.trim().toLowerCase()
  const results = collections.flatMap(collection => collection.records
    .filter(record => Object.entries(record)
      .filter(([key, value]) => key !== 'id' && key !== 'image' && (typeof value === 'string' || typeof value === 'number'))
      .some(([, value]) => String(value).toLowerCase().includes(normalizedQuery)))
    .map(record => ({
      id: `${collection.section}-${record.id}`,
      section: collection.section,
      title: collection.getTitle(record),
      details: collection.getDetails(record),
    })))

  return <section className="operation-page workspace-search-page">
    <div className="operation-heading"><div><span className="eyebrow blue-text">WORKSPACE</span><h1>Search results</h1><p>Matches across inventory, warehouse operations, rentals, and messages.</p></div></div>
    <section className="inventory-table-card">
      <div className="inventory-table-heading"><div><h2>Results for “{query.trim()}”</h2><p>{results.length} {results.length === 1 ? 'match' : 'matches'}</p></div><Search size={18}/></div>
      {results.length ? <div className="workspace-search-results">{results.map(result => <article className="workspace-search-result" key={result.id}>
        <div><span>{result.section}</span><strong>{result.title || 'Untitled record'}</strong><p>{result.details}</p></div>
        <button type="button" className="inventory-edit-button" onClick={() => onSelect(result.section)}>Open</button>
      </article>)}</div> : <div className="inventory-empty"><Search size={26}/><strong>No matches found</strong><p>Try another name, SKU, status, location, or detail.</p></div>}
    </section>
  </section>
}

function Dashboard() {
  const [active, setActive] = useState('Dashboard')
  const [expandedGroups, setExpandedGroups] = useState({
    'Warehouse Management': true,
    'Rental Portal': true,
  })
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light')
  const [addStockOpen, setAddStockOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openSidebarGroup, setOpenSidebarGroup] = useState(null)
  const [notice, setNotice] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [openCreateForm, setOpenCreateForm] = useState(false)
  const [username, setUsername] = useState(() => localStorage.getItem(usernameStorageKey) || '')
  const [profile, setProfile] = useState(() => ({
    name: localStorage.getItem(profileStorageKeys.name) || localStorage.getItem(usernameStorageKey) || '',
    username: localStorage.getItem(usernameStorageKey) || '',
    email: localStorage.getItem(profileStorageKeys.email) || '',
    phone: localStorage.getItem(profileStorageKeys.phone) || '',
    address: localStorage.getItem(profileStorageKeys.address) || '',
  }))
  const [inventory, setInventory] = useState(() => {
    return readStoredList(inventoryStorageKey)
  })
  const [listings, setListings] = useState(() => readStoredList(operationStorageKeys.listings))
  const [movements, setMovements] = useState(() => readStoredList(operationStorageKeys.movements))
  const [orders, setOrders] = useState(() => readStoredList(operationStorageKeys.orders))
  const [bookings, setBookings] = useState(() => readStoredList(operationStorageKeys.bookings))
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem(operationStorageKeys.favorites) || '[]'))
  const [messages, setMessages] = useState(() => readStoredList(operationStorageKeys.messages))
  const [warehouses, setWarehouses] = useState(() => readStoredList(operationStorageKeys.warehouses))
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem(operationStorageKeys.settings) || '{"lowStockThreshold":5,"density":"comfortable","showNotifications":true}'))
  const navigate = useNavigate()
  const toggleMenuGroup = title => {
    setExpandedGroups(current => ({ ...current, [title]: !current[title] }))
  }
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(themeStorageKey, nextTheme)
    setTheme(nextTheme)
  }
  const saveProfile = updatedProfile => {
    localStorage.setItem(usernameStorageKey, updatedProfile.username)
    localStorage.setItem(profileStorageKeys.name, updatedProfile.name)
    localStorage.setItem(profileStorageKeys.email, updatedProfile.email)
    localStorage.setItem(profileStorageKeys.phone, updatedProfile.phone)
    localStorage.setItem(profileStorageKeys.address, updatedProfile.address)
    setUsername(updatedProfile.username)
    setProfile(updatedProfile)
  }
  const persistCollection = (key, setRecords, updatedRecords) => {
    localStorage.setItem(key, JSON.stringify(updatedRecords))
    setRecords(updatedRecords)
  }
  const persistInventory = updatedInventory => {
    try {
      localStorage.setItem(inventoryStorageKey, JSON.stringify(updatedInventory))
    } catch (error) {
      if (error instanceof DOMException && ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(error.name)) {
        setNotice('Could not save inventory because browser storage is full. Remove an image or choose a smaller one.')
        return false
      }
      throw error
    }
    setInventory(updatedInventory)
    return true
  }
  const saveRecord = (key, records, setRecords, record) => {
    const updatedRecord = {
      ...record,
      createdAt: records.find(item => item.id === record.id)?.createdAt || record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toLocaleString(),
    }
    const updatedRecords = record.id
      ? records.map(item => item.id === record.id ? updatedRecord : item)
      : [{ ...updatedRecord, id: createId() }, ...records]
    try {
      localStorage.setItem(key, JSON.stringify(updatedRecords))
    } catch (error) {
      setNotice(`Could not save this record in browser storage: ${error.message}`)
      return false
    }
    setRecords(updatedRecords)
    setNotice(`${record.id ? 'Record updated' : 'Record added'} successfully.`)
    return true
  }
  const deleteRecord = (key, records, setRecords, id) => {
    persistCollection(key, setRecords, records.filter(item => item.id !== id))
    setNotice('Record deleted.')
  }
  const recordMovement = movement => {
    const newMovement = { ...movement, id: createId(), createdAt: new Date().toLocaleString() }
    persistCollection(operationStorageKeys.movements, setMovements, [newMovement, ...movements])
  }
  const addStock = stock => {
    const existingStock = inventory.find(item =>
      item.sku.toLowerCase() === stock.sku.toLowerCase() && item.warehouse === stock.warehouse
    )
    const updatedInventory = existingStock
      ? inventory.map(item => item.id === existingStock.id
        ? { ...item, quantity: item.quantity + stock.quantity, images: [...getInventoryImages(item), ...(stock.images || [])], updatedAt: 'Just now' }
        : item)
      : [{ ...stock, id: createId(), updatedAt: 'Just now' }, ...inventory]
    if (!persistInventory(updatedInventory)) return false
    recordMovement({ sku: stock.sku, item: stock.name, warehouse: stock.warehouse, type: 'Receive', quantity: stock.quantity })
    setAddStockOpen(false)
    setNotice(existingStock ? `${stock.quantity} units received for ${stock.sku}.` : `${stock.name} added to inventory.`)
    return true
  }
  const saveInventoryItem = (id, changes) => {
    if (!changes.name || !changes.sku) {
      setNotice('Item name and SKU are required.')
      return false
    }
    const duplicateSku = inventory.some(item =>
      item.id !== id && item.warehouse === changes.warehouse && item.sku.toLowerCase() === changes.sku.toLowerCase()
    )
    if (duplicateSku) {
      setNotice(`SKU ${changes.sku} already exists in ${changes.warehouse}.`)
      return false
    }
    const updatedInventory = inventory.map(item =>
      item.id === id ? { ...item, ...changes, updatedAt: 'Just now' } : item
    )
    if (!persistInventory(updatedInventory)) return false
    setNotice(`${changes.name} details updated.`)
    return true
  }
  const removeInventoryItem = id => {
    const item = inventory.find(entry => entry.id === id)
    if (!item || !window.confirm(`Delete ${item.name} and its current stock from inventory?`)) return
    if (persistInventory(inventory.filter(entry => entry.id !== id))) {
      setNotice(`${item.name} deleted from inventory.`)
    }
  }
  const saveWarehouse = record => {
    const name = record.name.trim()
    if (warehouses.some(item => item.id !== record.id && item.name.toLowerCase() === name.toLowerCase())) {
      setNotice(`A warehouse named “${name}” already exists.`)
      return false
    }
    const previous = warehouses.find(item => item.id === record.id)
    const saved = saveRecord(operationStorageKeys.warehouses, warehouses, setWarehouses, { ...record, name })
    if (saved && previous && previous.name !== name) {
      const updatedInventory = inventory.map(item => item.warehouse === previous.name ? { ...item, warehouse: name } : item)
      persistCollection(inventoryStorageKey, setInventory, updatedInventory)
    }
    return saved
  }
  const adjustInventoryQuantity = (id, adjustment) => {
    const target = inventory.find(item => item.id === id)
    if (!target || target.quantity + adjustment < 0) return false
    const updatedInventory = inventory.map(item => item.id === id
      ? { ...item, quantity: item.quantity + adjustment, updatedAt: 'Just now' }
      : item)
    if (!persistInventory(updatedInventory)) return false
    recordMovement({ sku: target.sku, item: target.name, warehouse: target.warehouse, type: adjustment < 0 ? 'Issue' : 'Receive', quantity: Math.abs(adjustment) })
    return true
  }
  const logout = () => {
    localStorage.removeItem(usernameStorageKey)
    navigate('/')
  }
  const warehouseFields = [
    { key: 'name', label: 'Warehouse name', required: true },
    { key: 'location', label: 'Location', required: true },
    { key: 'capacity', label: 'Capacity', type: 'number', min: 0, required: true },
    { key: 'notes', label: 'Notes', type: 'textarea', required: false },
  ]
  const movementFields = [
    { key: 'sku', label: 'Inventory SKU', type: 'select', options: inventory.map(item => ({ value: item.sku, label: `${item.name} (${item.sku})` })) },
    { key: 'type', label: 'Movement type', type: 'select', options: [{ value: 'Receive', label: 'Receive stock' }, { value: 'Issue', label: 'Issue stock' }] },
    { key: 'quantity', label: 'Quantity', type: 'number', min: 1, required: true },
    { key: 'reference', label: 'Reference / reason', required: false },
  ]
  const orderFields = [
    { key: 'orderNumber', label: 'Order number', required: true },
    { key: 'sku', label: 'Inventory SKU', type: 'select', options: inventory.map(item => ({ value: item.sku, label: `${item.name} (${item.sku})` })) },
    { key: 'quantity', label: 'Quantity', type: 'number', min: 1, required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Processing', 'Completed', 'Cancelled'].map(value => ({ value, label: value })) },
  ]
  const listingFields = [
    { key: 'name', label: 'Listing name', required: true },
    { key: 'type', label: 'Property type', type: 'select', options: ['Warehouse', 'Commercial', 'Residential'].map(value => ({ value, label: value })) },
    { key: 'city', label: 'Location', required: true },
    { key: 'size', label: 'Size', required: true },
    { key: 'price', label: 'Rent / price', required: true },
    { key: 'image', label: 'Listing image', type: 'image', required: false },
  ]
  const bookingFields = [
    { key: 'listingId', label: 'Rental listing', type: 'select', options: listings.map(item => ({ value: item.id, label: item.name })) },
    { key: 'customer', label: 'Booked by', required: true },
    { key: 'startDate', label: 'Start date', type: 'date', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Confirmed', 'Cancelled'].map(value => ({ value, label: value })) },
  ]
  const messageFields = [
    { key: 'sender', label: 'From', defaultValue: profile.name || username, required: true },
    { key: 'recipient', label: 'To', required: true },
    { key: 'message', label: 'Message', type: 'textarea', required: true },
  ]
  const toggleFavorite = id => {
    const updated = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id]
    persistCollection(operationStorageKeys.favorites, setFavorites, updated)
  }
  const handleMovementSave = record => {
    const item = inventory.find(entry => entry.sku === record.sku)
    const quantity = Number(record.quantity)
    if (!item || !Number.isInteger(quantity) || quantity < 1) {
      setNotice('Choose an inventory item and enter a valid quantity.')
      return false
    }
    const adjustment = record.type === 'Issue' ? -quantity : quantity
    if (item.quantity + adjustment < 0) {
      setNotice(`Not enough ${item.name} in stock to issue ${quantity} units.`)
      return false
    }
    const updatedInventory = inventory.map(entry => entry.id === item.id
      ? { ...entry, quantity: entry.quantity + adjustment, updatedAt: 'Just now' }
      : entry)
    persistCollection(inventoryStorageKey, setInventory, updatedInventory)
    recordMovement({ sku: item.sku, item: item.name, warehouse: item.warehouse, type: record.type, quantity, reference: record.reference })
    setNotice(`${record.type === 'Issue' ? 'Issued' : 'Received'} ${quantity} units of ${item.name}.`)
    return true
  }
  const saveListing = record => {
    return saveRecord(operationStorageKeys.listings, listings, setListings, record)
  }
  const saveSettings = updated => {
    localStorage.setItem(operationStorageKeys.settings, JSON.stringify(updated))
    setSettings(updated)
    setNotice('Settings saved.')
  }
  const lowStockItems = inventory.filter(item => item.quantity <= Number(settings.lowStockThreshold))
  const lowStockAlertCount = settings.showNotifications ? lowStockItems.length : 0
  const notificationCount = movements.length + messages.length
  const removeRecord = (key, records, setRecords) => id => {
    if (window.confirm('Delete this record?')) deleteRecord(key, records, setRecords, id)
  }
  const removeWarehouse = id => {
    const warehouse = warehouses.find(item => item.id === id)
    if (inventory.some(item => item.warehouse === warehouse?.name)) {
      setNotice('Move or remove this warehouse’s stock before deleting the warehouse.')
      return
    }
    removeRecord(operationStorageKeys.warehouses, warehouses, setWarehouses)(id)
  }
  const removeListing = id => {
    if (bookings.some(booking => booking.listingId === id)) {
      setNotice('Cancel or remove this listing’s bookings before deleting the listing.')
      return
    }
    if (window.confirm('Delete this rental listing?')) {
      persistCollection(operationStorageKeys.listings, setListings, listings.filter(item => item.id !== id))
      persistCollection(operationStorageKeys.favorites, setFavorites, favorites.filter(item => item !== id))
      setNotice('Rental listing deleted.')
    }
  }
  const handleQuickAction = label => {
    if (label === 'Add Stock / Receive' && warehouses.length === 0) {
      setActive('Warehouses')
      setOpenCreateForm(true)
      setNotice('Create a warehouse before adding stock.')
      return
    }
    if (label === 'Create Order' && inventory.length === 0) {
      setActive('Inventory')
      setAddStockOpen(false)
      setOpenCreateForm(false)
      setNotice('Add a warehouse and inventory before creating an order.')
      return
    }
    if (label === 'Book Rental' && listings.length === 0) {
      setActive('Browse Rentals')
      setOpenCreateForm(true)
      setNotice('Create a rental listing before creating a booking.')
      return
    }
    const destinations = {
      'Add Stock / Receive': ['Inventory', true],
      'Create Order': ['Orders', true],
      'Add Rental Listing': ['Browse Rentals', true],
      'Book Rental': ['My Bookings', true],
    }
    const [page, openForm] = destinations[label]
    setActive(page)
    setAddStockOpen(page === 'Inventory')
    setOpenCreateForm(openForm && page !== 'Inventory')
    setNotice(`${label} opened.`)
  }
  const operation = (title, description, records, fields, storageKey, setRecords, options = {}) =>
    <OperationPanel key={title} title={title} description={description} records={records} fields={fields} search={query} onSave={record=>saveRecord(storageKey,records,setRecords,record)} onDelete={removeRecord(storageKey,records,setRecords)} {...options}/>
  const searchCollections = [
    { section: 'Inventory', records: inventory, getTitle: item => item.name, getDetails: item => `${item.sku} · ${item.category} · ${item.warehouse} · ${item.quantity} units` },
    { section: 'Stock Movements', records: movements, getTitle: movement => `${movement.type} · ${movement.item || movement.sku}`, getDetails: movement => `${movement.quantity} units · ${movement.warehouse} · ${movement.reference || 'No reference'}` },
    { section: 'Warehouses', records: warehouses, getTitle: warehouse => warehouse.name, getDetails: warehouse => `${warehouse.location} · Capacity ${warehouse.capacity}` },
    { section: 'Orders', records: orders, getTitle: order => order.orderNumber, getDetails: order => `${order.sku} · ${order.quantity} units · ${order.status}` },
    { section: 'Browse Rentals', records: listings, getTitle: listing => listing.name, getDetails: listing => `${listing.type} · ${listing.city} · ${listing.price}` },
    { section: 'My Bookings', records: bookings, getTitle: booking => booking.customer, getDetails: booking => `${booking.status} · ${booking.startDate}` },
    { section: 'Messages', records: messages, getTitle: message => `${message.sender} → ${message.recipient}`, getDetails: message => message.message },
  ]
  let activeContent
  if (active === 'Profile') activeContent = <ProfilePanel profile={profile} onSave={saveProfile}/>
  else if (active === 'Settings') activeContent = <SettingsPanel settings={settings} onSave={saveSettings}/>
  else if (active === 'Inventory') activeContent = <InventoryPanel items={inventory} warehouseOptions={warehouses.map(item=>item.name)} search={query} addStockOpen={addStockOpen} onOpenAddStock={() => setAddStockOpen(true)} onReceiveStock={addStock} onCloseAddStock={() => setAddStockOpen(false)} onUpdateItem={saveInventoryItem} onAdjustQuantity={adjustInventoryQuantity} onDeleteItem={removeInventoryItem} onCreateWarehouse={()=>{setActive('Warehouses');setAddStockOpen(false)}}/>
  else if (active === 'Warehouses') activeContent = operation('Warehouses', 'Create and manage the locations where your stock is stored.', warehouses, warehouseFields, operationStorageKeys.warehouses, setWarehouses, { addLabel: 'Add warehouse', autoOpen: openCreateForm, onSave: saveWarehouse, onDelete: removeWarehouse })
  else if (active === 'Stock Movements') activeContent = operation('Stock Movements', 'Record stock receipts and issues. Each movement updates on-hand inventory.', movements, movementFields, operationStorageKeys.movements, setMovements, { addLabel: 'Record movement', autoOpen: openCreateForm, disableAdd: !inventory.length, onSave: handleMovementSave, immutable: true })
  else if (active === 'Orders') activeContent = operation('Orders', 'Create and track warehouse orders against existing inventory items.', orders, orderFields, operationStorageKeys.orders, setOrders, { addLabel: 'Create order', autoOpen: openCreateForm, disableAdd: !inventory.length })
  else if (active === 'Barcode / RFID') activeContent = <BarcodePanel inventory={inventory} search={query} onAdjustQuantity={adjustInventoryQuantity}/>
  else if (active === 'Reports') activeContent = <ReportsPanel inventory={inventory} movements={movements} orders={orders} listings={listings} bookings={bookings}/>
  else if (active === 'Browse Rentals') activeContent = operation('Browse Rentals', 'Add and manage rental listings available in your local workspace.', listings, listingFields, operationStorageKeys.listings, setListings, { addLabel: 'Add rental listing', autoOpen: openCreateForm, renderActions: record => <button type="button" className="inventory-action-cancel" onClick={()=>toggleFavorite(record.id)}><Heart size={13} fill={favorites.includes(record.id)?'currentColor':'none'}/>{favorites.includes(record.id)?'Saved':'Save'}</button>, onDelete: removeListing })
  else if (active === 'My Bookings') activeContent = operation('My Bookings', 'Create and track requests for your locally saved rental listings.', bookings, bookingFields, operationStorageKeys.bookings, setBookings, { addLabel: 'Create booking', autoOpen: openCreateForm, disableAdd: !listings.length, emptyMessage: listings.length ? undefined : 'Create a rental listing before making a booking.' })
  else if (active === 'Favorites') activeContent = <FavoritesPanel listings={listings} favoriteIds={favorites} onToggleFavorite={toggleFavorite}/>
  else if (active === 'Messages') activeContent = operation('Messages', 'Keep notes and message records for your rental conversations.', messages, messageFields, operationStorageKeys.messages, setMessages, { addLabel: 'New message', autoOpen: openCreateForm })
  else activeContent = <DashboardOverview username={username} inventory={inventory} warehouses={warehouses} listings={listings} bookings={bookings} movements={movements} lowStockItems={lowStockItems} onNavigate={page=>{setActive(page);setOpenCreateForm(false);setAddStockOpen(false)}} onQuickAction={handleQuickAction}/>
  return <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${settings.density === 'compact' ? 'dashboard-compact' : ''} ${theme === 'dark' ? 'theme-dark' : ''}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><div className="sidebar-heading"><Brand light to="/dashboard" onClick={() => {setActive('Dashboard');setQuery('');setAddStockOpen(false);setOpenCreateForm(false);setOpenSidebarGroup(null);setMobileNav(false)}}/><button type="button" className="sidebar-collapse" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} data-tooltip={sidebarCollapsed ? 'Expand sidebar' : undefined} aria-pressed={sidebarCollapsed} onClick={() => {setSidebarCollapsed(current => !current);setOpenSidebarGroup(null)}}>{sidebarCollapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button></div><div className="sidebar-menu">{menuGroups.map(group => {
      const expanded = Boolean(expandedGroups[group.title])
      const flyoutOpen = sidebarCollapsed && openSidebarGroup === group.title
      const submenuId = `submenu-${group.title.toLowerCase().replace(/\s+/g, '-')}`
      return <div key={group.title}>{group.items.length > 0 ? <div className={`side-group-header ${active === group.title ? 'side-group-active' : ''}`}><button type="button" className="side-link" aria-label={sidebarCollapsed ? group.title : undefined} data-tooltip={sidebarCollapsed && !flyoutOpen ? group.title : undefined} aria-expanded={sidebarCollapsed ? flyoutOpen : expanded} aria-controls={sidebarCollapsed ? `flyout-${submenuId}` : submenuId} onClick={() => {if (sidebarCollapsed) setOpenSidebarGroup(current => current === group.title ? null : group.title);else {setActive(group.items[0]);setOpenCreateForm(false);setAddStockOpen(false);setMobileNav(false)}}}><group.icon size={19}/><span className="sidebar-label">{group.title}</span></button><button type="button" className="side-group-toggle" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.title}`} aria-expanded={expanded} aria-controls={submenuId} title={`${expanded ? 'Collapse' : 'Expand'} ${group.title}`} onClick={() => toggleMenuGroup(group.title)}><ChevronDown size={15} className={`side-chevron ${expanded ? 'side-chevron-open' : ''}`}/></button>{flyoutOpen && <div className="side-submenu-flyout" id={`flyout-${submenuId}`} aria-label={`${group.title} menu`}>
        <div className="side-submenu-flyout-heading"><div><span>WORKSPACE MENU</span><strong>{group.title}</strong></div><button type="button" aria-label={`Close ${group.title} menu`} onClick={() => setOpenSidebarGroup(null)}><X size={15}/></button></div>
        <div className="side-submenu-flyout-options">{group.items.map(item => <button key={item} type="button" onClick={() => {setActive(item);setOpenCreateForm(false);setAddStockOpen(false);setOpenSidebarGroup(null);setMobileNav(false)}} className={active === item ? 'sub-active' : ''}><span>{item}</span>{active === item && <CheckCircle2 size={15}/>}</button>)}</div>
      </div>}</div> : <button type="button" className={`side-link ${active === group.title ? 'side-active' : ''}`} aria-label={sidebarCollapsed ? group.title : undefined} data-tooltip={sidebarCollapsed ? group.title : undefined} onClick={() => {setActive(group.title);setOpenCreateForm(false);setMobileNav(false)}}><group.icon size={19}/><span className="sidebar-label">{group.title}</span></button>}{group.items.length > 0 && <div className="side-submenu" id={submenuId} hidden={!expanded}>{group.items.map(item=><button key={item} title={sidebarCollapsed ? item : undefined} onClick={()=>{setActive(item);setOpenCreateForm(false);setAddStockOpen(false);setOpenSidebarGroup(null);setMobileNav(false)}} className={active===item?'sub-active':''}>• &nbsp; <span className="sidebar-label">{item}</span></button>)}</div>}</div>
    })}</div><div className="sidebar-bottom"><button className={`side-link ${active === 'Profile' ? 'side-active' : ''}`} aria-label={sidebarCollapsed ? 'Profile' : undefined} data-tooltip={sidebarCollapsed ? 'Profile' : undefined} onClick={() => {setActive('Profile');setOpenSidebarGroup(null);setOpenCreateForm(false);setMobileNav(false)}}><User size={19}/><span className="sidebar-label">Profile</span></button><button className={`side-link ${active === 'Settings' ? 'side-active' : ''}`} aria-label={sidebarCollapsed ? 'Settings' : undefined} data-tooltip={sidebarCollapsed ? 'Settings' : undefined} onClick={() => {setActive('Settings');setOpenSidebarGroup(null);setOpenCreateForm(false);setMobileNav(false)}}><Settings size={19}/><span className="sidebar-label">Settings</span></button><button type="button" className="side-link" aria-label={sidebarCollapsed ? 'Logout' : undefined} data-tooltip={sidebarCollapsed ? 'Logout' : undefined} onClick={() => {setOpenSidebarGroup(null);logout()}}><LogOut size={19}/><span className="sidebar-label">Logout</span></button><div className="sidebar-tag"><Warehouse size={42}/><strong>Smarter Operations.<br/>Better Spaces.</strong></div></div></aside>
    <main className="dashboard-main"><header className="dash-topbar"><button className="mobile-menu dash-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle dashboard menu"><Menu/></button><div className="dash-search"><Search size={18}/><input placeholder="Search in this workspace..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><div className="notification-menu"><button type="button" className="icon-button" aria-label={`${notificationCount} recent activity and messages`} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={()=>setNotificationsOpen(current=>!current)}><Bell/>{notificationCount > 0 && <span className="notification-dot">{notificationCount > 99 ? '99+' : notificationCount}</span>}</button>{notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Recent activity and messages"><section><h3>Recent Activity</h3>{movements.slice(0,4).length ? movements.slice(0,4).map(movement=><button type="button" className="notification-entry" key={movement.id} onClick={()=>{setActive('Stock Movements');setNotificationsOpen(false);setAddStockOpen(false);setOpenCreateForm(false)}}><strong>{movement.type} · {movement.item || movement.sku}</strong><span>{movement.quantity} units · {movement.warehouse}</span><small>{formatRecordDate(movement.createdAt)}</small></button>) : <p className="notification-empty">No recent stock activity.</p>}</section><section><h3>Messages</h3>{messages.slice(0,4).length ? messages.slice(0,4).map(message=><button type="button" className="notification-entry" key={message.id} onClick={()=>{setActive('Messages');setNotificationsOpen(false);setAddStockOpen(false);setOpenCreateForm(false)}}><strong>{message.sender} → {message.recipient}</strong><span>{message.message}</span><small>{formatRecordDate(message.createdAt || message.updatedAt)}</small></button>) : <p className="notification-empty">No messages yet.</p>}<button type="button" className="notification-view-all" onClick={()=>{setActive('Messages');setNotificationsOpen(false);setAddStockOpen(false);setOpenCreateForm(false)}}>Open Messages →</button></section></div>}</div><div className="user-menu"><button type="button" className="user-chip" aria-expanded={userMenuOpen} aria-haspopup="menu" onClick={() => setUserMenuOpen(!userMenuOpen)}><span>{(username || 'U').charAt(0).toUpperCase()}</span><div><strong>{username || 'User'}</strong><small>Account</small></div><ChevronDown size={15}/></button>{userMenuOpen && <div className="user-menu-dropdown" role="menu"><button type="button" role="menuitem" onClick={()=>{setActive('Profile');setOpenSidebarGroup(null);setUserMenuOpen(false)}}><User size={16}/>Profile</button><button type="button" role="menuitem" onClick={()=>{setOpenSidebarGroup(null);logout()}}><LogOut size={16}/>Logout</button></div>}</div></header>
      {notice && <div className="notice" role="status"><CheckCircle2 size={17}/>{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {query.trim()
        ? <WorkspaceSearchPanel query={query} collections={searchCollections} onSelect={section => {setActive(section);setQuery('');setAddStockOpen(false);setOpenCreateForm(false)}}/>
        : activeContent}
    </main>
    <aside className="right-rail"><section className="quick-actions"><h3><Settings size={20}/>Quick Actions</h3>{[{label:'Add Stock / Receive',icon:Warehouse,color:'blue'},{label:'Create Order',icon:Package,color:'green'},{label:'Add Rental Listing',icon:House,color:'purple'},{label:'Book Rental',icon:CalendarDays,color:'teal'}].map(action=><button type="button" key={action.label} className={`quick-btn quick-${action.color}`} onClick={()=>handleQuickAction(action.label)}><action.icon size={20}/>{action.label}<ArrowRight size={17}/></button>)}</section><section className="rail-panel"><div className="panel-heading"><h3><Clock3 size={18}/>Recent Stock Activity</h3><button type="button" onClick={()=>setActive('Stock Movements')}>View All →</button></div>{movements.slice(0,4).length ? movements.slice(0,4).map(movement=><div className="activity-row" key={movement.id}><span className="activity-icon activity-blue"><Package size={16}/></span><div><strong>{movement.type}: {movement.sku}</strong><p>{movement.quantity} units · {movement.warehouse}</p></div><small>{movement.createdAt}</small></div>) : <p className="rail-empty">No stock activity recorded.</p>}</section><section className="rail-panel"><div className="panel-heading"><h3><Bell size={18}/>Low Stock Alerts</h3><button type="button" onClick={()=>setActive('Settings')}>Settings →</button></div>{settings.showNotifications && lowStockItems.length ? lowStockItems.slice(0,5).map(item=><div className="notification-row" key={item.id}><span className="activity-icon activity-orange"><CircleHelp size={16}/></span><div><strong>{item.name} · {item.sku}</strong><small>{item.quantity} left in {item.warehouse}</small></div></div>) : <p className="rail-empty">{settings.showNotifications ? 'No low stock alerts.' : 'Low stock alerts are turned off.'}</p>}</section></aside>
  </div>
}

function AuthLayout({ mode }) {
  const isSignup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', username: '', password: '', confirm: '', remember: true, terms: true })
  const navigate = useNavigate()
  const update = e => setForm({...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value})
  const submit = e => {
    e.preventDefault()
    if (isSignup && form.password !== form.confirm) { setMessage('Passwords do not match.'); return }
    if (isSignup) {
      const username = form.username.trim()
      if (!username) {
        setMessage('Please enter a username.')
        return
      }
      localStorage.setItem(usernameStorageKey, username)
      localStorage.setItem(profileStorageKeys.name, form.name.trim())
      localStorage.setItem(profileStorageKeys.email, form.email.trim())
      localStorage.setItem(profileStorageKeys.phone, form.phone.trim())
      localStorage.setItem(profileStorageKeys.address, '')
      navigate('/dashboard')
      return
    }
    const username = form.username.trim()
    if (!username) {
      setMessage('Please enter your username.')
      return
    }
    localStorage.setItem(usernameStorageKey, username)
    navigate('/dashboard')
  }
  return <div className="auth-page"><section className="auth-story" style={{backgroundImage:`linear-gradient(90deg,rgba(4,38,72,.96),rgba(4,38,72,.68),rgba(4,38,72,.2)),url(${warehouseImage})`}}><Brand light/><div className="story-content"><h1>{isSignup ? <>Create Your Account<br/><span>Get Started Today</span></> : <>Manage Warehouses.<br/>Rent Spaces. Grow Together.</>}</h1><p>{isSignup ? 'Join WMS Rentals and manage your warehouse and rental needs with ease. Fast. Secure. Reliable.' : 'Smart warehouse solutions for your storage and rental needs.'}</p><div className="story-benefits">{[{icon:Warehouse,title:'Warehouse Management',text:'Track inventory, manage stock, and optimize operations.'},{icon:House,title:'Rental Listings',text:'Find and list warehouse and commercial spaces for rent.'},{icon:CalendarDays,title:'Easy Bookings',text:'Manage bookings and keep your business moving.'},{icon:ShieldCheck,title:'Secure & Reliable',text:'Your data and operations are always protected.'}].map(b=><div key={b.title}><span><b.icon size={25}/></span><p><strong>{b.title}</strong><small>{b.text}</small></p></div>)}</div></div><div className="story-tagline">Build a Smarter<br/>Warehouse Future</div></section>
    <section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-logo"><span className="brand-mark"><Box size={36}/></span></div><h2>{isSignup ? 'Create Account' : 'Welcome Back!'}</h2><p className="auth-subtitle">{isSignup ? 'Join WMS Rentals and start managing your warehouse and rental properties today.' : 'Sign in to your WMS Rentals account'}</p>
      <form onSubmit={submit} className="auth-form">
        {isSignup && <><label>Full Name <em>*</em><div className="input-wrap"><User size={18}/><input name="name" placeholder="Enter your full name" value={form.name} onChange={update} required/></div></label><label>Email Address <em>*</em><div className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email address" value={form.email} onChange={update} required/></div></label><label>Mobile Number <em>*</em><div className="input-wrap"><Phone size={18}/><input name="phone" type="tel" placeholder="Enter your mobile number" value={form.phone} onChange={update} required/></div></label></>}
        <label>{isSignup ? 'Username' : 'Username'} <em>*</em><div className="input-wrap"><User size={18}/><input name="username" placeholder={isSignup ? 'Choose a username' : 'Enter your username'} value={form.username} onChange={update} autoComplete="username" required/></div></label>
        <label>Password <em>*</em><div className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder={isSignup ? 'Create a strong password' : 'Enter your password'} value={form.password} onChange={update} autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={6}/><button type="button" className="input-icon-button" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {isSignup && <label>Confirm Password <em>*</em><div className="input-wrap"><LockKeyhole size={18}/><input name="confirm" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" value={form.confirm} onChange={update} required minLength={6}/></div></label>}
        {!isSignup ? <div className="auth-options"><label className="check-label"><input type="checkbox" name="remember" checked={form.remember} onChange={update}/> Remember me</label><button type="button" className="text-link" onClick={()=>setMessage('Password reset flow: connect this action to your API.')}>Forgot Password?</button></div> : <label className="check-label terms-check"><input type="checkbox" name="terms" checked={form.terms} onChange={update} required/> I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></label>}
        <button className="btn btn-primary auth-submit" type="submit">{isSignup ? <><UserRoundPlus size={19}/> Sign Up <ArrowRight size={20}/></> : <>Login <ArrowRight size={21}/></>}</button>
        {message && <div className={message.includes('match') ? 'form-message form-error' : 'form-message'}>{message}</div>}
        <div className="or-divider"><span>or</span></div>
        {isSignup ? <button type="button" className="google-btn" onClick={()=>setMessage('Google sign-up needs OAuth configuration.')}><b>G</b> Sign up with Google</button> : <Link className="google-btn" to="/signup"><UserRoundPlus size={18}/> Create New Account</Link>}
      </form><p className="auth-switch">{isSignup ? 'Already have an account?' : "Don't have an account?"} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Login' : 'Sign Up'}</Link></p><small className="copyright">© 2026 WMS Rentals. All rights reserved.</small></div></section></div>
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/dashboard" element={<Dashboard/>}/>
    <Route path="/login" element={<AuthLayout mode="login"/>}/>
    <Route path="/signup" element={<AuthLayout mode="signup"/>}/>
    <Route path="*" element={<Home/>}/>
  </Routes>
}
