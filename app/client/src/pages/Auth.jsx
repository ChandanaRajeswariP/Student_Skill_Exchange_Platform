import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try { if (isRegister) await register(form); else await login(form.email, form.password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Unable to connect. Make sure the backend is running.'); }
    finally { setBusy(false); }
  };
  return <div className="auth-page"><Link to="/" className="back-home"><ArrowLeft size={17}/> Back to home</Link><div className="auth-card"><Link to="/" className="brand dark-brand auth-brand"><span className="brand-icon"><GraduationCap/></span><span>SkillSwap<small>STUDENT EXCHANGE</small></span></Link><div className="auth-heading"><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1><p>{isRegister ? 'Join a community where everyone has something to teach.' : 'Sign in to continue your learning journey.'}</p></div><form onSubmit={submit} className="form-stack">{isRegister && <label>Full name<input name="name" value={form.name} onChange={change} placeholder="e.g. Ananya Sharma" required/></label>}<label>Email address<input type="email" name="email" value={form.email} onChange={change} placeholder="you@college.edu" required/></label><label>Password<input type="password" name="password" value={form.password} onChange={change} placeholder="At least 8 characters for new accounts" minLength={isRegister ? 8 : 1} maxLength={72} required/></label>{error && <div className="error-box">{error}</div>}<button className="btn btn-primary submit-btn" disabled={busy}>{busy ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}</button></form><div className="auth-switch">{isRegister ? 'Already have an account?' : "Don't have an account?"} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Sign up'}</Link></div></div><p className="auth-foot">Built for students, powered by shared knowledge.</p></div>;
}
