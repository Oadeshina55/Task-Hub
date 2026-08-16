(async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IjZhN2YyZDg5OGMyNTk2ODkyZWJmMTlkMCIsInJvbGUiOiJtZW1iZXIiLCJlbWFpbCI6Im1lbWJlckB0YXNraHViLmNvbSIsImlhdCI6MTc4NjcxOTY3OCwiZXhwIjoxNzg3MzI0NDc4fQ.TR94gGCsWM1lCPoONy4w3nivr9fs-vexwsuAeNdEAQs';
    const resp = await fetch('http://localhost:3001/api/vouchers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1200, reason: 'test from script' }),
    });
    console.log('STATUS', resp.status);
    console.log(await resp.text());
  } catch (e) { console.error(e); }
})();
