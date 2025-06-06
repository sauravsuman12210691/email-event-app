const { google } = require('googleapis');
const {filterEmailWithGemini } = require("../services/geminiFilterService.js")
async function getEventEmails(accessToken) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const afterTimestamp = Math.floor(tenDaysAgo.getTime() / 1000);

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${afterTimestamp}`,
      maxResults: 100,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) return [];

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id });

        const subject = msgData.data.snippet || 'No Subject';

        const headers = msgData.data.payload.headers || [];
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';

        const parts = msgData.data.payload?.parts || [];
        let body = '';

        if (parts.length) {
          const textPart = parts.find(part => part.mimeType === 'text/plain');
          if (textPart && textPart.body && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (msgData.data.payload?.body?.data) {
          body = Buffer.from(msgData.data.payload.body.data, 'base64').toString('utf-8');
        }

        return {
          id: msg.id,
          subject: subject,
          from: fromHeader,
          snippet: msgData.data.snippet,
          body: body,
        };
      })
    );

    // Now filter using Gemini AI
    const filteredEmails = [];
    for (const email of detailedMessages) {
      const filterResult = await filterEmailWithGemini(email.subject, email.body);
      if (filterResult.isRelevant) {
        filteredEmails.push({
          ...email,
          reason: filterResult.reason,
          links: filterResult.links,
        });
      }
    }

    return filteredEmails;

  } catch (error) {
    console.error('Error fetching or filtering event emails:', error);
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