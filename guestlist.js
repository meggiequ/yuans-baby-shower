exports.handler = async () => {
  const token  = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables', token: !!token, siteId: !!siteId }),
    };
  }

  try {
    // Get all forms for the site
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!formsRes.ok) {
      const text = await formsRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Forms API failed', status: formsRes.status, detail: text }) };
    }

    const forms = await formsRes.json();
    const rsvpForm = forms.find(f => f.name === 'rsvp');

    if (!rsvpForm) {
      // Return form names so we can see what Netlify actually named the form
      return { statusCode: 200, body: JSON.stringify({ debug: 'no rsvp form found', forms: forms.map(f => f.name) }) };
    }

    // Get all submissions
    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${rsvpForm.id}/submissions?per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!subRes.ok) {
      const text = await subRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Submissions API failed', status: subRes.status, detail: text }) };
    }

    const submissions = await subRes.json();

    const cleaned = submissions.map(s => ({
      name:                s.data?.name                    || '',
      phone:               s.data?.phone                   || '',
      attending:           s.data?.attending               || '',
      plusOnes:            s.data?.['plus-ones']           || '0',
      dietaryRestrictions: s.data?.['dietary-restrictions'] || '',
      createdAt:           s.created_at,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
