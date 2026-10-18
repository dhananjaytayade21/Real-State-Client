import React, { useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bell, Box, Building2, CalendarDays, ChartNoAxesCombined,
  CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock3, Eye,
  EyeOff, Forklift, Heart, House, KeyRound, LayoutDashboard, LockKeyhole,
  LogOut, Mail, MapPin, Menu, MessageSquare, Package, Phone, Search,
  Settings, ShieldCheck, Truck, User, UserRoundPlus, Users, Warehouse,
  X, Barcode, BadgeCheck, FileText
} from 'lucide-react'

const warehouseImage = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=85'
const warehouseWide = 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?auto=format&fit=crop&w=1400&q=85'
const apartmentImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85'
const officeImage = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85'
const storageImage = 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1000&q=85'
const homeImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85'

function Brand({ light = false }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}>
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
const listings = [
  { type: 'Warehouse', name: 'Industrial Warehouse', city: 'Nagpur, Maharashtra', size: '10,000 sq ft', price: '₹ 2.5 / sq ft / month', image: warehouseWide },
  { type: 'Commercial', name: 'Office Space', city: 'Wani, Maharashtra', size: '1,500 sq ft', price: '₹ 12,000 / month', image: officeImage },
  { type: 'Residential', name: '2 BHK Apartment', city: 'Yavatmal, Maharashtra', size: '1,200 sq ft', price: '₹ 15,000 / month', image: apartmentImage },
  { type: 'Warehouse', name: 'Storage Space', city: 'Nagpur, Maharashtra', size: '5,000 sq ft', price: '₹ 1.8 / sq ft / month', image: storageImage },
]

function ListingCard({ item, compact = false }) {
  const [saved, setSaved] = useState(false)
  return <article className={`listing-card ${compact ? 'listing-compact' : ''}`}>
    <div className="listing-image"><img src={item.image} alt={item.name} /><span className={`pill pill-${item.type.toLowerCase()}`}>{item.type}</span><button className={`heart-btn ${saved ? 'saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Save listing"><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button></div>
    <div className="listing-body"><strong>{item.name}</strong><p className="muted"><MapPin size={13} />{item.city}</p><div className="listing-meta"><span><Building2 size={13} />{item.size}</span><span>{item.price}</span></div></div>
  </article>
}

function Home() {
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
      <section className="popular-section" id="popular"><div className="content-width"><div className="section-heading"><div><span className="eyebrow blue-text">FEATURED</span><h2>Popular Listings</h2></div><a href="#rentals">View All <ArrowRight size={15}/></a></div><div className="listing-grid">{listings.map(item => <ListingCard item={item} key={item.name}/>)}</div></div></section>
    </main>
    <footer className="site-footer" id="contact"><Brand light/><nav><a href="/">Home</a><a href="#warehouse">Warehouse</a><a href="#rentals">Rental</a><a href="#about">About</a><a href="#contact">Contact</a></nav><span>© 2026 WMSRentals. All rights reserved.</span></footer>
  </>
}

const menuGroups = [
  { title: 'Dashboard', icon: LayoutDashboard, items: [] },
  { title: 'Warehouse Management', icon: Warehouse, items: ['Inventory','Stock Movements','Orders','Barcode / RFID','Reports'] },
  { title: 'Rental Portal', icon: House, items: ['Browse Rentals','My Bookings','Favorites','Messages'] },
]
function Dashboard() {
  const [active, setActive] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')
  const activities = [
    { icon: Truck, color: 'green', title: 'Order #ORD-1024', text: 'Stock received - 50 units', time: '2 hours ago' },
    { icon: House, color: 'purple', title: 'Booking Confirmed', text: '2 BHK Apartment - Yavatmal', time: '4 hours ago' },
    { icon: Box, color: 'blue', title: 'Inventory Updated', text: 'Item: Laptop (10 units)', time: '5 hours ago' },
    { icon: MessageSquare, color: 'orange', title: 'New Message', text: 'From: Property Owner', time: '6 hours ago' },
  ]
  const filtered = listings.filter(x => `${x.name} ${x.city} ${x.type}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="dashboard-layout">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><Brand light/><div className="sidebar-menu">{menuGroups.map(group => <div key={group.title}><button className={`side-link ${active === group.title ? 'side-active' : ''}`} onClick={() => {setActive(group.title);setMobileNav(false)}}><group.icon size={19}/>{group.title}{group.items.length > 0 && <ChevronDown size={15} className="side-chevron"/>}</button>{group.items.length > 0 && <div className="side-submenu">{group.items.map(item => <button key={item} onClick={() => {setActive(item);setMobileNav(false)}} className={active === item ? 'sub-active' : ''}>• &nbsp; {item}</button>)}</div>}</div>)}</div><div className="sidebar-bottom"><button className="side-link" onClick={() => setActive('Profile')}><User size={19}/>Profile</button><button className="side-link" onClick={() => setActive('Settings')}><Settings size={19}/>Settings</button><Link className="side-link" to="/login"><LogOut size={19}/>Logout</Link><div className="sidebar-tag"><Warehouse size={42}/><strong>Smarter Operations.<br/>Better Spaces.</strong></div></div></aside>
    <main className="dashboard-main"><header className="dash-topbar"><button className="mobile-menu dash-menu" onClick={() => setMobileNav(!mobileNav)}><Menu/></button><div className="dash-search"><Search size={18}/><input placeholder="Search warehouse, rentals, orders..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="icon-button" onClick={() => setNotice(notice ? '' : 'You are all caught up!')}><Bell/><span className="notification-dot">2</span></button><div className="user-chip"><span>N</span><div><strong>Nandlal</strong><small>User</small></div><ChevronDown size={15}/></div></header>
      {notice && <div className="notice"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      <section className="dash-welcome" style={{backgroundImage:`linear-gradient(90deg,rgba(6,27,49,.88),rgba(6,27,49,.08)),url(${warehouseImage})`}}><div><h1>Welcome Back, Nandlal!</h1><p>Manage your warehouse operations and explore<br/>rental opportunities — all in one place.</p></div></section>
      <section className="stats-grid">
        {[{label:'Total Warehouses',value:'2',icon:Warehouse,color:'blue',link:'View details'},{label:'Total Stock Items',value:'1,248',icon:Package,color:'green',link:'View inventory'},{label:'Active Bookings',value:'3',icon:FileText,color:'purple',link:'View bookings'},{label:'Listed Properties',value:'5',icon:House,color:'orange',link:'View rentals'}].map(s=><button className={`stat-card stat-${s.color}`} key={s.label} onClick={()=>setActive(s.label)}><s.icon size={32}/><div><span>{s.label}</span><strong>{s.value}</strong><small>{s.link} <ArrowRight size={12}/></small></div></button>)}
      </section>
      <div className="dashboard-columns"><section className="dash-panel warehouse-overview"><div className="panel-heading"><h3><Warehouse size={20}/>Warehouse Overview</h3><button onClick={()=>setActive('Inventory')}>View All →</button></div>{[{name:'Main Warehouse',city:'Nagpur, Maharashtra',image:warehouseImage,total:'842',stock:'751',out:'91'},{name:'Secondary Warehouse',city:'Wardha, Maharashtra',image:storageImage,total:'406',stock:'372',out:'34'}].map(w=><div className="warehouse-row" key={w.name}><img src={w.image} alt={w.name}/><div className="warehouse-info"><strong>{w.name}</strong><p className="muted"><MapPin size={13}/>{w.city}</p><div className="mini-stats"><span>Total Items<strong>{w.total}</strong></span><span>In Stock<strong>{w.stock}</strong></span><span>Out of Stock<strong>{w.out}</strong></span></div><button className="btn btn-primary btn-small" onClick={()=>setActive('Inventory')}>View Inventory <ArrowRight size={13}/></button></div></div>)}</section>
      <section className="dash-panel rental-overview"><div className="panel-heading"><h3><House size={20}/>Rental Listings</h3><button onClick={()=>setActive('Browse Rentals')}>View All →</button></div>{listings.slice(2).concat(listings.slice(1,2)).map(item=><div className="rental-row" key={item.name}><img src={item.image} alt={item.name}/><div><span className="for-rent">For Rent</span><strong>{item.name}</strong><p className="muted"><MapPin size={12}/>{item.city}</p><b>{item.price.split(' / ')[0]} / month</b></div><button className="btn btn-outline btn-small" onClick={()=>setActive('Browse Rentals')}>View Details →</button></div>)}</section>
      <section className="dash-panel top-properties"><div className="panel-heading"><h3><House size={20}/>Top Rental Properties</h3><button onClick={()=>setActive('Browse Rentals')}>View All →</button></div><div className="top-property-grid">{filtered.slice(0,4).map(item=><ListingCard item={item} compact key={item.name}/>)}</div></section></div>
    </main>
    <aside className="right-rail"><section className="quick-actions"><h3><Settings size={20}/>Quick Actions</h3>{[{label:'Add Stock / Receive',icon:Warehouse,color:'blue',action:'Inventory'},{label:'Create Order',icon:Package,color:'green',action:'Orders'},{label:'Add Rental Listing',icon:House,color:'purple',action:'Rental Portal'},{label:'Book Rental',icon:CalendarDays,color:'teal',action:'Browse Rentals'}].map(a=><button key={a.label} className={`quick-btn quick-${a.color}`} onClick={()=>{setActive(a.action);setNotice(`${a.label} selected`)}}><a.icon size={23}/>{a.label}<ArrowRight size={17}/></button>)}</section><section className="rail-panel"><div className="panel-heading"><h3><Clock3 size={18}/>Recent Activity</h3><button onClick={()=>setNotice('Showing recent activity')}>View All →</button></div>{activities.map(a=><div className="activity-row" key={a.title}><span className={`activity-icon activity-${a.color}`}><a.icon size={17}/></span><div><strong>{a.title}</strong><p>{a.text}</p></div><small>{a.time}</small></div>)}</section><section className="rail-panel"><div className="panel-heading"><h3><Bell size={18}/>Notifications</h3><button onClick={()=>setNotice('All notifications displayed')}>View All →</button></div>{[{icon:CheckCircle2,color:'green',title:'Your booking request is confirmed.',time:'2 hours ago'},{icon:CircleHelp,color:'orange',title:'Low stock alert: Item #ITM-204',time:'5 hours ago'},{icon:House,color:'purple',title:'New rental property listed in Wani.',time:'1 day ago'}].map(n=><div className="notification-row" key={n.title}><span className={`activity-icon activity-${n.color}`}><n.icon size={17}/></span><div><strong>{n.title}</strong><small>{n.time}</small></div></div>)}</section></aside>
  </div>
}

function AuthLayout({ mode }) {
  const isSignup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', username: '', password: '', confirm: '', remember: true, terms: true })
  const update = e => setForm({...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value})
  const submit = e => {
    e.preventDefault()
    if (isSignup && form.password !== form.confirm) { setMessage('Passwords do not match.'); return }
    setMessage(isSignup ? 'Account form validated. Connect your API to create the account.' : 'Demo login validated. Connect your authentication API to continue.')
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
