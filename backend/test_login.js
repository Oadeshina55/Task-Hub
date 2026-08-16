(async () => {
  try {
    const resp = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@taskhub.com', password: 'Member123!' }),
    });
    const text = await resp.text();
    console.log('STATUS', resp.status);
    console.log(text);
  } catch (e) { console.error('ERR', e); }
})();
