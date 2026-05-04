exports.handler = async () => {
  const token  = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' }),
    };
  }

  try {
    // Get the form ID for "rsvp"
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const forms = await formsRes.json();
    const rsvpForm = forms.find(f => f.name === 'rsvp');

    if (!rsvpForm) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    // Get all submissions
    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${rsvpForm.id}/submissions?per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const submissions = await subRes.json();

    // Map to clean shape
    const cleaned = submissions.map(s => ({
      name:                s.data?.name                || '',
      phone:               s.data?.phone               || '',
      attending:           s.data?.attending            || '',
      plusOnes:            s.data?.['plus-ones']        || '0',
      dietaryRestrictions: s.data?.['dietary-restrictions'] || '',
      createdAt:           s.created_at,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned),
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
