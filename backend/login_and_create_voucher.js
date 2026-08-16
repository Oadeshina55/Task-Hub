(async () => {
  try {
    const loginResp = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'member@taskhub.com', password: 'Member123!' }),
    });
    const loginBody = await loginResp.json();
    console.log('Login status', loginResp.status);
    if (!loginResp.ok) { console.log(loginBody); return; }
    const token = loginBody.token;
    const resp = await fetch('http://localhost:3001/api/vouchers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1200, reason: 'test immediate' }),
    });
    console.log('Create status', resp.status);
    console.log(await resp.text());
  } catch (e) { console.error(e); }
})();
