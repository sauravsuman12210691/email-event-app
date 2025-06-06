import React, { useEffect, useState } from 'react';

export default function GoogleLoginFetchEmails() {
  const [accessToken, setAccessToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    /* global google */
    if (!window.google) {
      setError('Google API script not loaded');
      return;
    }

    // Initialize Google Identity Services token client once
    google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, // Put your client ID in .env file
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: (tokenResponse) => {
        setAccessToken(tokenResponse.access_token);
      },
    });
  }, []);

  function handleLogin() {
    if (!window.google) return;

    window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          setError(tokenResponse.error);
          return;
        }
        setAccessToken(tokenResponse.access_token);
      },
    }).requestAccessToken();
  }

  useEffect(() => {
    if (!accessToken) return;

    fetch(`${import.meta.env.VITE_SERVER_DOMAIN}/api/email/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.emails) setEmails(data.emails);
        else setError('No emails found');
      })
      .catch(err => setError(err.message));
  }, [accessToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-pink-600 text-white flex flex-col items-center py-12 px-6">
      <h1 className="text-4xl font-extrabold mb-8 drop-shadow-lg">Emails</h1>

      {!accessToken && (
        <button
          onClick={handleLogin}
          className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-blue-100 transition"
        >
          Login with Google
        </button>
      )}

      {error && (
        <p className="mt-6 text-red-400 font-medium drop-shadow-md">{`Error: ${error}`}</p>
      )}

      {emails.length > 0 && (
        <div className="mt-10 w-full max-w-3xl bg-white bg-opacity-20 rounded-lg p-6 shadow-lg backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-4 border-b border-white/50 pb-2">Emails</h2>
          <ul className="space-y-4 max-h-96 overflow-y-auto">
            {emails.map((email, i) => (
              <li
                key={i}
                className="bg-white bg-opacity-30 rounded-md p-4 shadow-md hover:bg-white hover:bg-opacity-40 transition cursor-pointer"
              >
                <strong className="text-lg text-white">{email.subject}</strong>
                <pre className="mt-2 text-sm text-black whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {email.body.substring(0, 200)}...
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
