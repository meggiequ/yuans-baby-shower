exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Twilio env vars' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, phone, attending } = body;

  // Only send confirmation if they're going or maybe
  if (!phone || attending === 'No') {
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  // Clean phone number — ensure it has country code
  const cleaned = phone.replace(/\D/g, '');
  const to = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;

  const firstName = name.split(' ')[0];
  const message = `Hi ${firstName}! You're all set for Yuan & Denis's Baby Shower on Saturday, May 30th, 2–5pm at 11745 Casa Linda Court, Dublin CA. Can't wait to see you! 🌸`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To:   to,
          Body: message,
        }).toString(),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error('Twilio error:', data);
      return { statusCode: 500, body: JSON.stringify({ error: data.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, sid: data.sid }) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
