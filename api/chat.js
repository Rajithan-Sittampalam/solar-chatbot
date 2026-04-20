// ============================================
// api/chat.js – Der sichere Mittelsmann
//
// Diese Datei läuft auf dem SERVER (Vercel)
// Besucher können sie nicht sehen!
// Der API Key ist nur hier gespeichert.
// ============================================

export default async function handler(req, res) {

  // Nur POST-Anfragen erlauben
  // (der Chatbot schickt immer POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST erlaubt' });
  }

  // Nachrichtenverlauf aus der Anfrage holen
  // (kommt von index.html)
  const { messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'Keine Nachrichten erhalten' });
  }

  // -----------------------------------------------
  // DER KEY – sicher aus der Umgebungsvariable
  // Du siehst hier KEINEN echten Key!
  // Der Key wird später bei Vercel eingetragen
  // unter: Settings → Environment Variables
  // -----------------------------------------------
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API Key nicht konfiguriert' });
  }

  // Persönlichkeit des Bots
  const SYSTEM_PROMPT = `Du bist ein freundlicher und kompetenter Solar-Berater bei Swiss Energy Partner GmbH in der Schweiz.

Deine Aufgaben:
- Beantworte Fragen zu Photovoltaik, Solaranlagen und erneuerbaren Energien
- Erkläre Kosten, Förderprogramme und Einsparungen in der Schweiz
- Empfehle bei konkretem Interesse eine persönliche Beratung
- Antworte immer auf Deutsch, professionell aber freundlich
- Halte Antworten übersichtlich (max. 4-5 Sätze)

Wenn jemand ein Angebot oder Termin möchte, sage: "Gerne können Sie uns unter info@swissenergypartner.ch kontaktieren oder einen Termin buchen."`;

  try {
    // Anfrage an Groq schicken – mit dem echten Key
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ]
      })
    });

    const data = await groqResponse.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // Nur die Antwort zurückschicken – kein Key, nichts sensibles
    const reply = data.choices?.[0]?.message?.content || 'Keine Antwort erhalten.';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
