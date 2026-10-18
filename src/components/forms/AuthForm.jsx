import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, User, UserRoundPlus } from 'lucide-react'

export default function AuthForm({ isSignup, form, update, showPassword, setShowPassword, message, setMessage, onSubmit }) {
  return <form onSubmit={onSubmit} className="auth-form">
    {isSignup && <>
      <label>Full Name <em>*</em><div className="input-wrap"><User size={18}/><input name="name" placeholder="Enter your full name" value={form.name} onChange={update} required/></div></label>
      <label>Email Address <em>*</em><div className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="Enter your email address" value={form.email} onChange={update} required/></div></label>
      <label>Mobile Number <em>*</em><div className="input-wrap"><Phone size={18}/><input name="phone" type="tel" placeholder="Enter your mobile number" value={form.phone} onChange={update} required/></div></label>
    </>}
    <label>Username <em>*</em><div className="input-wrap"><User size={18}/><input name="username" placeholder={isSignup ? 'Choose a username' : 'Enter your username'} value={form.username} onChange={update} autoComplete="username" required/></div></label>
    <label>Password <em>*</em><div className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} placeholder={isSignup ? 'Create a strong password' : 'Enter your password'} value={form.password} onChange={update} autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={6}/><button type="button" className="input-icon-button" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
    {isSignup && <label>Confirm Password <em>*</em><div className="input-wrap"><LockKeyhole size={18}/><input name="confirm" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" value={form.confirm} onChange={update} required minLength={6}/></div></label>}
    {!isSignup ? <div className="auth-options"><label className="check-label"><input type="checkbox" name="remember" checked={form.remember} onChange={update}/> Remember me</label><button type="button" className="text-link" onClick={()=>setMessage('Password reset flow: connect this action to your API.')}>Forgot Password?</button></div> : <label className="check-label terms-check"><input type="checkbox" name="terms" checked={form.terms} onChange={update} required/> I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></label>}
    <button className="btn btn-primary auth-submit" type="submit">{isSignup ? <><UserRoundPlus size={19}/> Sign Up <ArrowRight size={20}/></> : <>Login <ArrowRight size={21}/></>}</button>
    {message && <div className={message.includes('match') ? 'form-message form-error' : 'form-message'}>{message}</div>}
    <div className="or-divider"><span>or</span></div>
    {isSignup ? <button type="button" className="google-btn" onClick={()=>setMessage('Google sign-up needs OAuth configuration.')}><b>G</b> Sign up with Google</button> : <Link className="google-btn" to="/signup"><UserRoundPlus size={18}/> Create New Account</Link>}
  </form>
}
