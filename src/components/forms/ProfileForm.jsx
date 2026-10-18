import React from 'react'
import { Save, X } from 'lucide-react'

export default function ProfileForm({ form, onChange, onCancel, onSubmit }) {
  return <form className="profile-form" onSubmit={onSubmit}>
    <label>Full Name<input name="name" value={form.name} onChange={onChange} autoComplete="name" required/></label>
    <label>Username<input name="username" value={form.username} onChange={onChange} autoComplete="username" required/></label>
    <label>Email Address<input name="email" type="email" value={form.email} onChange={onChange} autoComplete="email"/></label>
    <label>Mobile Number<input name="phone" type="tel" value={form.phone} onChange={onChange} autoComplete="tel"/></label>
    <label>Address<textarea name="address" value={form.address} onChange={onChange} autoComplete="street-address" rows="3"/></label>
    <div className="profile-form-actions"><button type="button" className="btn btn-outline profile-cancel" onClick={onCancel}><X size={16}/>Cancel</button><button type="submit" className="btn btn-primary"><Save size={16}/>Save Changes</button></div>
  </form>
}
