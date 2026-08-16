(async () => {
  try {
    const login = await fetch('http://localhost:3001/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'admin@taskhub.com', password: 'Admin123!' }) });
    const lb = await login.json();
    const token = lb.token;
    const r = await fetch('http://localhost:3001/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
    console.log('TASKS STATUS', r.status);
    console.log(await r.text());
  } catch (e) { console.error(e); }
})();
