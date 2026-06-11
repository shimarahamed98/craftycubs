const { google } = require('googleapis');

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Fix private key — Netlify escapes \n as \\n
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Also handle if it was stored with literal newlines already
    if (!privateKey.includes('\n')) {
      privateKey = privateKey.split('\\n').join('\n');
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const sheetId = process.env.GOOGLE_SHEETS_ID;

    if (!privateKey || !clientEmail || !sheetId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: `Missing env vars. privateKey: ${!!privateKey}, clientEmail: ${!!clientEmail}, sheetId: ${!!sheetId}`
        }),
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const [breakdownRes, investmentRes, monthlyRes, summaryRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Breakdown!A:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Investment!A:C' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Summary By Month!A:J' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Summary!A1:BA30' }),
    ]);

    // Parse monthly data
    const mRows = monthlyRes.data.values || [];
    const monthlyData = [];
    if (mRows.length >= 5) {
      const years    = mRows[0] || [];
      const months   = mRows[1] || [];
      const revenues = mRows[2] || [];
      const costs    = mRows[3] || [];
      const profits  = mRows[4] || [];
      for (let i = 1; i < years.length; i++) {
        const yr  = parseInt(years[i]);
        const mo  = parseInt(months[i]);
        const rev = parseFloat(revenues[i]) || 0;
        const cost= parseFloat(costs[i]) || 0;
        const profit = parseFloat(profits[i]) || 0;
        if (!isNaN(yr) && !isNaN(mo) && (rev || cost)) {
          monthlyData.push({ year: yr, month: mo, revenue: rev, cost, profit });
        }
      }
    }

    // Parse investment by person
    const invRows = investmentRes.data.values || [];
    const investment = { R: 0, T: 0 };
    invRows.forEach(row => {
      const cost   = parseFloat(row[1]) || 0;
      const person = (row[2] || '').trim().toUpperCase();
      if (person === 'R') investment.R += cost;
      if (person === 'T') investment.T += cost;
    });

    // Parse withdrawals from Summary sheet
    const sumRows = summaryRes.data.values || [];
    const withdrawals = { R: 0, T: 0 };
    sumRows.forEach(row => {
      const label = (row[0] || '').trim();
      if (label === 'R' && row.length > 2) {
        row.slice(2).forEach(v => { withdrawals.R += parseFloat(v) || 0; });
      }
      if (label === 'T' && row.length > 2) {
        row.slice(2).forEach(v => { withdrawals.T += parseFloat(v) || 0; });
      }
    });

    // Parse events from breakdown
    const bRows = breakdownRes.data.values || [];
    const eventMap = {};
    bRows.forEach(row => {
      const eventId = row[0];
      if (!eventId || isNaN(parseFloat(eventId))) return;
      const id = String(Math.round(parseFloat(eventId)));
      if (!eventMap[id]) eventMap[id] = { id, revenue: 0, costs: [], notes: '', totalCost: 0 };
      const itemType = (row[1] || '').trim();
      const value    = parseFloat(row[2]) || 0;
      const person   = (row[3] || '').trim();
      const notes    = (row[4] || '').trim();
      if (itemType === 'Revenue') {
        eventMap[id].revenue += value;
        if (notes) eventMap[id].notes = notes;
      } else if (itemType && value > 0) {
        eventMap[id].costs.push({ type: itemType, value, person, notes });
        eventMap[id].totalCost += value;
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        monthlyData,
        investment,
        withdrawals,
        events: Object.values(eventMap).sort((a, b) => parseInt(b.id) - parseInt(a.id)),
        syncedAt: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('Sheets sync error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
