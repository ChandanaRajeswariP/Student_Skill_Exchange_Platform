import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toUtc = value => new Date(value.replace(' ', 'T') + 'Z');
const detail = error => error.response?.data?.error || error.message;

export default function Sessions() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const teacherId = Number(params.get('teacher'));
  const [sessions, setSessions] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadSessions() {
    const { data } = await api.get('/sessions');
    setSessions(data);
  }

  useEffect(() => {
    loadSessions().catch(error => setError(detail(error)));
  }, []);

  useEffect(() => {
    setTeacher(null);
    if (!teacherId) return;
    let active = true;
    const params = { studentId: teacherId };
    Promise.all([
      api.get('/students'),
      api.get('/availability', { params }),
      api.get('/reviews', { params: { teacherId } }),
    ]).then(([students, windows, feedback]) => {
      if (!active) return;
      setTeacher(students.data.students.find(student => student.id === teacherId) || null);
      setAvailability(windows.data);
      setReviews(feedback.data);
    }).catch(error => { if (active) setError(detail(error)); });
    return () => { active = false; };
  }, [teacherId]);

  async function perform(action, success) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await loadSessions();
    } catch (error) {
      setError(detail(error));
    } finally {
      setBusy(false);
    }
  }

  function book(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    perform(() => api.post('/sessions', {
      teacherId,
      skillId: Number(form.get('skill')),
      start: new Date(form.get('start')).toISOString(),
      duration: Number(form.get('duration')),
      note: form.get('note'),
    }), 'Session requested.');
  }

  function review(event, sessionId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    perform(() => api.post('/reviews', {
      sessionId, rating: Number(form.get('rating')), comment: form.get('comment'),
    }), 'Review posted.');
  }

  return <div className="content-page">
    <div className="page-title"><h1>Sessions</h1><p>Request a lesson, manage bookings, or review a completed session.</p></div>
    {error && <p role="alert" className="error-box">{error}</p>}
    {message && <p role="status" className="success-message">{message}</p>}
    {teacher && <section className="panel match-panel">
      <h2>Book with {teacher.name}</h2>
      <p>{availability.length ? 'Weekly availability (UTC)' : 'This student has not added availability.'}</p>
      <ul>{availability.map(({day,start,end}) => <li key={`${day}-${start}-${end}`}>{days[day]} {start}:00–{end}:00</li>)}</ul>
      <form className="form-stack" key={teacherId} onSubmit={book}>
        <label>Skill<select name="skill" required>{teacher.teaches.map(skill => <option value={skill.id} key={skill.id}>{skill.name}</option>)}</select></label>
        <label>Start time (your local time)<input name="start" type="datetime-local" required/></label>
        <label>Duration in minutes<input name="duration" type="number" min="15" max="180" defaultValue="30" required/></label>
        <label>Note<textarea name="note" maxLength="500"/></label>
        <button className="btn btn-primary" disabled={busy || !teacher.teaches.length || !availability.length}>Request session</button>
      </form>
      {reviews.length > 0 && <div className="profile-section"><h3>Reviews for {teacher.name}</h3>
        <ul>{reviews.map((entry, index) => <li key={index}>{entry.rating}/5 · {entry.name} — {entry.comment}</li>)}</ul>
      </div>}
    </section>}
    <section className="panel match-panel profile-section">
      <div className="panel-heading"><h2>My sessions</h2><Link to="/discover" className="text-link">Find a teacher</Link></div>
      {!sessions.length && <p>No sessions yet.</p>}
      {sessions.map(session => {
        const teaching = session.teacher_id === user.id;
        const active = ['pending', 'accepted'].includes(session.status);
        const change = status => perform(() => api.patch('/sessions/' + session.id, { status }), 'Session updated.');
        return <article className="profile-section" key={session.id}>
          <h3>{session.skill} with {teaching ? session.learner : session.teacher}</h3>
          <p>{toUtc(session.starts_at).toLocaleString()} · {session.status}</p>
          {session.note && <p>{session.note}</p>}
          <div className="add-row">
            {teaching && session.status === 'pending' && <button className="btn btn-primary" disabled={busy} onClick={() => change('accepted')}>Accept</button>}
            {active && <button className="btn btn-outline" disabled={busy} onClick={() => change('cancelled')}>Cancel session</button>}
            {teaching && session.status === 'accepted' && toUtc(session.ends_at) <= new Date() && <button className="btn btn-primary" disabled={busy} onClick={() => change('completed')}>Mark complete</button>}
          </div>
          {!teaching && session.status === 'completed' && !session.review_id &&
            <form className="form-stack" onSubmit={event => review(event, session.id)}>
              <label>Rating<select name="rating" defaultValue="5">{[1,2,3,4,5].map(rating => <option key={rating}>{rating}</option>)}</select></label>
              <label>Review<textarea name="comment" required minLength="3" maxLength="1000"/></label>
              <button className="btn btn-primary" disabled={busy}>Post review</button>
            </form>}
        </article>;
      })}
    </section>
  </div>;
}
