require("dotenv").config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function filterEmailWithGemini(subject, body) {
  const model = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a smart email filtering assistant.

Check if this email is related to:
- Online technical assessments
- Internship role tests (like SDE intern, frontend intern, etc.)
- Coding challenges or test links
- Anything related to job/intern hiring assessments

Important keywords might include:
- "online test", "assessment", "technical round", "test login time", "intern role", "secure browser", "demo test"
- URLs to platforms like mettl, hackerrank, testinvite, google forms, etc.

### Task:
Analyze the following subject and body.
Return only if it's **relevant to a candidate looking for job/internship technical assessments**.

Give the result in this exact JSON:
{
  "isRelevant": true or false,
  "reason": "Short one-liner",
  "links": [list of URLs if any]
}

Subject: ${subject}
Body: ${body}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text();

    // Clean the response: remove ```json ... ``` blocks if present
    const cleaned = text
      .replace(/```json\s*([\s\S]*?)\s*```/, '$1') // remove fenced code block
      .replace(/```([\s\S]*?)\s*```/, '$1') // fallback for plain ``` ```
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Error parsing Gemini AI response:", error);
    return {
      isRelevant: false,
      reason: "Failed to parse response",
      links: []
    };
  }
}

module.exports = { filterEmailWithGemini };
