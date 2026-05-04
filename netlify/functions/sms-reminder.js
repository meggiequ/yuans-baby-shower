exports.handler = async () => {
  const accountSid   = process.env.TWILIO_ACCOUNT_SID;
  const authToken    = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber   = process.env.TWILIO_PHONE_NUMBER;
  const siteId       = process.env.NETLIFY_SITE_ID;
  const netlifyToken = process.env.NETLIFY_API_TOKEN;

  if (!accountSid || !authToken || !fromNumber || !siteId || !netlifyToken) {
    console.error('Missing env vars');
    return { statusCode: 500 };
  }

  try {
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${netlifyToken}` } }
    );
    const forms = await formsRes.json();
    const rsvpForm = forms.find(f => f.name === 'rsvp');
    if (!rsvpForm) { console.log('No rsvp form found'); return { statusCode: 200 }; }

    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${rsvpForm.id}/submissions?per_page=100`,
      { headers: { Authorization: `Bearer ${netlifyToken}` } }
    );
    const submissions = await subRes.json();

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    let sent = 0, skipped = 0;

    for (const s of submissions) {
      const phone     = s.data?.phone     || '';
      const name      = s.data?.name      || 'there';
      const attending = s.data?.attending || '';

      if (!phone || attending === 'No') { skipped++; continue; }

      const cleaned = phone.replace(/\D/g, '');
      const to = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
      const firstName = name.split(' ')[0];
      const message = `Hi ${firstName}! Just a reminder — Yuan & Denis's Baby Shower is this Saturday, May 30th, 2–5pm at 11745 Casa Linda Court, Dublin CA. See you soon! 🌸`;

      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: fromNumber, To: to, Body: message }).toString(),
          }
        );
        const data = await res.json();
        if (res.ok) { sent++; console.log(`Sent to ${name} (${to})`); }
        else { console.error(`Failed for ${name}:`, data.message); }
      } catch (err) {
        console.error(`Error sending to ${name}:`, err.message);
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Reminder complete — sent: ${sent}, skipped: ${skipped}`);
    return { statusCode: 200 };

  } catch (err) {
    console.error('Scheduler error:', err);
    return { statusCode: 500 };
  }
};
