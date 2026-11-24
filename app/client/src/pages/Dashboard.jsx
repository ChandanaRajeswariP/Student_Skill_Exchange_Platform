import { useEffect, useState } from 'react';
import { CalendarDays, Users, BookOpen, Sparkles, ArrowUpRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SkillTag from '../components/SkillTag';

const initials = name => (name || 'S').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
export default function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  useEffect(() => { api.get('/students/recommended').then(r => setMatches(r.data.matches)).catch(() => {}); }, []);
  const [upcoming, setUpcoming] = useState('—');
  useEffect(() => { api.get('/sessions').then(({data}) => setUpcoming(data.filter(s => ['pending','accepted'].includes(s.status) && Date.parse(s.starts_at.replace(' ', 'T') + 'Z') > Date.now()).length)).catch(() => {}); }, []);
  const stats = [[Users, matches.length, 'Skill matches'], [CalendarDays, upcoming, 'Upcoming sessions'], [BookOpen, user?.teaches?.length || 0, 'Skills teaching'], [Sparkles, user?.learns?.length || 0, 'Skills learning']];
  return <div className="dashboard-page">
    <section className="welcome-row"><div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>Welcome back, {user?.name?.split(' ')[0] || 'student'} <span>✦</span></h1><p>Learn new skills, share your expertise, and grow together.</p></div><div className="welcome-note"><div className="note-spark">✦</div><b>Learn a skill.<br/>Teach a skill.</b><small>Grow together.</small></div></section>
    <section className="stats-grid">{stats.map(([Icon, value, label]) => <div className="stat-card" key={label}><div className="stat-icon"><Icon size={21}/></div><div><strong>{value}</strong><span>{label}</span></div></div>)}</section>
    <div className="dashboard-grid"><section className="panel match-panel"><div className="panel-heading"><div><div className="eyebrow">GOOD PEOPLE, GREAT IDEAS</div><h2>Recommended matches</h2><p>Students who may be a great fit for your learning goals.</p></div><Link to="/discover" className="text-link">Explore all <ArrowUpRight size={16}/></Link></div>
      {matches.length ? <div className="match-grid">{matches.slice(0,3).map((m,i)=><article className="match-card" key={m.id}><div className="match-top"><div className={`person-avatar avatar-${i%4}`}>{initials(m.name)}</div><span className="match-score">{m.score}% match</span></div><h3>{m.name}</h3><p className="muted">{m.course || 'Student'} {m.year ? `· ${m.year}` : ''}</p><div className="match-divider"/><div className="match-detail"><b>Can teach</b><div>{(m.teaches || []).slice(0,3).map(s=><SkillTag key={s.name}>{s.name}</SkillTag>)}</div></div><div className="match-detail"><b>Availability</b><span>{(m.availability || []).join(', ') || 'Not specified'}</span></div><Link to="/discover" className="btn btn-outline full-btn">View students</Link></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Sparkles/></div><h3>Your matches are waiting</h3><p>Add skills you want to learn to your profile to get relevant suggestions.</p><Link to="/profile" className="btn btn-primary">Complete your profile</Link></div>}
    </section>
    <aside className="right-column"><section className="panel side-panel"><div className="panel-heading compact"><div><div className="eyebrow">QUICK START</div><h2>Make a move</h2></div></div><Link className="quick-link" to="/profile"><span className="quick-icon"><BookOpen/></span><span><b>Add your skills</b><small>Share what you can teach</small></span><ArrowUpRight size={16}/></Link><Link className="quick-link" to="/discover"><span className="quick-icon blue"><Users/></span><span><b>Find students</b><small>Discover your next match</small></span><ArrowUpRight size={16}/></Link></section><section className="panel side-panel tip-panel"><div className="tip-icon"><Clock3/></div><div className="eyebrow">A LITTLE REMINDER</div><h3>Consistency beats intensity.</h3><p>Even 20 minutes of peer learning can move you forward. Make time to share what you know.</p></section></aside></div>
  </div>;
}
