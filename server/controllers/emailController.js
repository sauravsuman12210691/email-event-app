const { google } = require('googleapis');

// Keywords to identify online test company interviews or relevant meetings
const KEYWORDS = [
  'interview',
  'online test',
  'assessment',
  'coding challenge',
  'technical round',
  'sde intern',
  'xeno',       // example company name from your context
  'google meet',
  'zoom',
  'teams',
];

// Patterns to extract meeting & calendar links
const MEETING_LINK_PATTERNS = [
  /https?:\/\/\S*zoom\.us\/\S*/gi,
  /https?:\/\/meet\.google\.com\/\S*/gi,
  /https?:\/\/teams\.microsoft\.com\/\S*/gi,
  /https?:\/\/drive\.google\.com\/\S*/gi,
  /https?:\/\/calendar\.google\.com\/\S*/gi,
];

async function getEventEmails(accessToken) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    // Search broadly with meeting-related keywords, maxResults 30 for better filtering
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'meeting OR drive OR invite OR zoom OR calendar OR interview OR assessment OR test',
      maxResults: 30,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) return [];

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id });

        const headers = msgData.data.payload.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const dateStr = headers.find(h => h.name.toLowerCase() === 'date')?.value || null;
        const date = dateStr ? new Date(dateStr).toISOString() : null;

        // Decode body text (plain text part)
        let body = '';
        const parts = msgData.data.payload.parts || [];

        if (parts.length) {
          const textPart = parts.find(p => p.mimeType === 'text/plain' && p.body?.data);
          if (textPart) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (msgData.data.payload.body?.data) {
          body = Buffer.from(msgData.data.payload.body.data, 'base64').toString('utf-8');
        }

        // Lowercase combined text for keyword matching
        const textToSearch = (subject + '\n' + body).toLowerCase();

        // Check if any keyword matches
        const hasKeyword = KEYWORDS.some(keyword => textToSearch.includes(keyword.toLowerCase()));
        if (!hasKeyword) return null; // Skip emails without any keyword

        // Extract meeting/calendar/drive links
        const links = MEETING_LINK_PATTERNS
          .map((regex) => {
            const matches = [];
            let match;
            while ((match = regex.exec(textToSearch)) !== null) {
              matches.push(match[0]);
            }
            return matches;
          })
          .flat();

        if (links.length === 0) return null; // Skip emails without meeting links

        return {
          subject,
          from,
          snippet: msgData.data.snippet || '',
          date,
          links: [...new Set(links)],
        };
      })
    );

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
