const { google } = require('googleapis');

async function getEventEmails(accessToken) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    // Search for emails containing meeting, drive, invite, zoom, calendar keywords broadly
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'meeting OR drive OR invite OR zoom OR calendar',
      maxResults: 20,  // Fetch more to filter strictly below
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) return [];

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        
        const subject = msgData.data.snippet || 'No Subject';

        // Extract all headers for more info (e.g. subject, from)
        const headers = msgData.data.payload.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';

        // Decode email body (try plain text part)
        const parts = msgData.data.payload?.parts || [];
        let body = '';

        if (parts.length) {
          const textPart = parts.find(part => part.mimeType === 'text/plain');
          if (textPart && textPart.body && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8').toLowerCase();
          }
        } else if (msgData.data.payload?.body?.data) {
          body = Buffer.from(msgData.data.payload.body.data, 'base64').toString('utf-8').toLowerCase();
        }

        // Filter conditions (case-insensitive)
        const isDrive = body.includes('drive.google.com') || subject.toLowerCase().includes('drive');
        const isZoom = body.includes('zoom.us') || body.includes('zoom.com') || subject.toLowerCase().includes('zoom');
        const isMeetingInvite = /scheduled meeting|invite|meeting|calendar/.test(body + subject.toLowerCase());

        // Return only if matches any filter condition
        if (isDrive || isZoom || isMeetingInvite) {
          return {
            subject: subject,
            from: fromHeader,
            snippet: msgData.data.snippet,
            body: body,
          };
        } else {
          return null;  // Ignore irrelevant emails
        }
      })
    );

    // Filter out nulls (non-matching emails)
    return detailedMessages.filter(Boolean);

  } catch (error) {
    console.error('Error fetching event emails:', error);
    return [];
  }
}

exports.fetchEventEmails = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) return res.status(401).json({ error: 'Access token missing' });

    const emails = await getEventEmails(accessToken);
    res.json({ emails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch event emails' });
  }
};
