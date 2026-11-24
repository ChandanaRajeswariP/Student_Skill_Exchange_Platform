import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Search, UserRound, BookOpen, Settings, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = [
    [LayoutDashboard, 'Dashboard', '/dashboard'],
    [Search, 'Discover students', '/discover'],
    [UserRound, 'My profile', '/profile'],
    [BookOpen, 'My skills', '/profile#skills'],
    [Settings, 'Sessions', '/sessions']
  ];
  const [error, setError] = useState('');
  const signOut = async () => {
    try { await logout(); navigate('/'); }
    catch { setError('Could not log out. Please try again.'); }
  };
  return <div className="app-shell">
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <NavLink to="/dashboard" className="brand"><span className="brand-icon"><GraduationCap/></span><span>SkillSwap<small>STUDENT EXCHANGE</small></span></NavLink>
      <div className="nav-label">WORKSPACE</div>
      <nav>{links.map(([Icon, label, to]) => <NavLink onClick={() => setOpen(false)} key={to} to={to} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={19}/>{label}</NavLink>)}<a href="/library" className="nav-link"><BookOpen size={19}/>Resource library</a></nav>
      <div className="sidebar-bottom">
        <div className="help-card"><Sparkles size={18}/><b>Keep growing</b><span>Every skill shared makes a difference.</span></div>
        {error && <p role="alert">{error}</p>}
        <button className="nav-link logout" onClick={signOut}><LogOut size={19}/>Log out</button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">Student workspace <span>/</span> <b>Overview</b></div><div className="top-user"><div className="avatar-mini">{(user?.name || 'S').slice(0,1).toUpperCase()}</div><span>{user?.name || 'Student'}</span></div></header>
      <div className="page-content"><Outlet/></div>
    </main>
  </div>;
}
