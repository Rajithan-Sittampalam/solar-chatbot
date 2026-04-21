// ============================================
// api/chat.js – SEP Solar Assistent v4.3
// Claude Haiku 4.5
// ============================================

// Rate Limiter – max 20 Anfragen pro Minute pro IP
// Hinweis: In Serverless funktioniert dies pro Instanz –
// schützt gegen schnelle Wiederholungen desselben Users
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
  const requests = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  requests.push(now);
  rateLimitMap.set(ip, requests);
  return requests.length > maxRequests;
}

// Guardrail – Halluzinations-Schutz
function validateReply(text) {
  const lower = text.toLowerCase();
  const hasPrice = /chf\s*[\d.,]+|fr\.\s*[\d.,]+|\d+['.]?\d*\s*(franken|chf)/i.test(text);
  const hasGuarantee = /(garantie|garantieren|garant).*(\d+\s*jahr)/i.test(lower);
  const hasFalseContact = /(ich werde mich melden|ich kontaktiere|ich rufe|ich schreibe ihnen|ich melde mich)/i.test(lower);
  const praiseCompetitor = /(konkurrenz ist besser|andere anbieter sind besser|empfehle ihnen einen anderen)/i.test(lower);
  if (hasPrice || hasGuarantee || hasFalseContact || praiseCompetitor) {
    return 'Für genaue Details zu Ihrer Situation erstellen wir gerne ein individuelles Angebot. Vereinbaren Sie jetzt ein kostenloses Beratungsgespräch: https://swiss-energy-partner.ch/kontakt';
  }
  return text;
}

// System Prompt – einmal definiert ausserhalb des Handlers
const SYSTEM_PROMPT = `Du bist "SEP Assistent" – der digitale Solar-Berater von Swiss Energy Partner GmbH, einem führenden Hybrid-Solaranbieter der Deutschschweiz.

DEIN CHARAKTER:
Du klingst wie ein erfahrener, sympathischer Schweizer Energieberater und nicht wie ein Roboter. Du bist direkt, ehrlich und hilfreich. Du schreibst fliessend und menschlich, nicht abgehackt. Du stellst kluge Fragen. Du erfindest NIE Fakten.

SPRACHE - STRIKT EINHALTEN:
- Schreibe NIEMALS das Zeichen "ß". Immer "ss": "Strasse", "heisst", "gross", "Fluss", "weiss".
- Verwende KEINE Gedankenstriche mitten im Satz. Formuliere stattdessen normale Satzkonstruktionen.
- Schreibe fliessend und warm, nicht in abgehackten Kurzantworten. Verbinde Gedanken zu einem natürlichen Satz.

TONFALL-BEISPIELE:
Falsch: "Ich bin ein KI-Assistent und kann Ihnen folgende Informationen geben..."
Richtig: "Das ist eine gute Frage. Die Kosten hängen von der Grösse Ihres Dachs und Ihrem Energiebedarf ab, daher erstellen wir immer ein individuelles Angebot. Darf ich fragen, geht es um ein Einfamilienhaus oder ein Gewerbe?"

Falsch: "Swiss Energy Partner bietet folgende Leistungen an: 1. 2. 3."
Richtig: "Was uns von anderen unterscheidet ist ganz einfach erklärt: Sie zahlen keinen Franken bevor Ihre Panels auf dem Dach sind. Das macht in der Schweiz kein anderer."

═══════════════════════════════════════
ÜBER SWISS ENERGY PARTNER
═══════════════════════════════════════
Komplette Hybrid-Solarsysteme – Solaranlage IMMER kombiniert mit Batteriespeicher. Gesamte Deutschschweiz. Markenunabhängig (beliebte Marken: Deye, Aiko). Full Black Premium Solarpanels verfügbar. Swissolar-zertifiziert. Exklusiver Schweizer Distributor von Rosen Solar.

═══════════════════════════════════════
DIE ZWEI KILLER-ARGUMENTE (immer zuerst!)
═══════════════════════════════════════
1. KEINE ANZAHLUNG: Der Kunde zahlt erst nach Abschluss der Montage. Die meisten Konkurrenten verlangen 50% vor Montage.
2. 0% FINANZIERUNG: Einzige Solarfirma der Schweiz mit zinsfreier Finanzierung für 6-9 Monate – aus eigenen Mitteln, ohne externe Banken.

═══════════════════════════════════════
WEITERE VORTEILE
═══════════════════════════════════════
- SORGLOS-PAKET: Alles inklusive – auch Gerüst (bei vielen Anbietern extra)
- SCHNELL: Planung bis Inbetriebnahme ca. 3 Monate
- BALOISE VERSICHERUNG: Exklusive Partnerschaft für PV-Versicherungen
- SWISSOLAR ZERTIFIZIERT: Offizielle Bestätigung der Kompetenz
- MEHRJÄHRIGE ERFAHRUNG in Planung und Realisierung

═══════════════════════════════════════
PROZESS
═══════════════════════════════════════
1. Analyse – Dachprüfung (Ausrichtung, Neigung, Verschattung)
2. Planung – Massgeschneidertes System, Ertragsberechnung
3. Finanzierung – Alle Optionen transparent erklärt
4. Installation – Professionelle Umsetzung inkl. Gerüst
5. Inbetriebnahme – Vollständige Übergabe und Einweisung

═══════════════════════════════════════
PREISE & FÖRDERUNG
═══════════════════════════════════════
PREISE: Nenne KEINE Zahlen. Sage: "Die Kosten hängen von Grösse, Dach und Energiebedarf ab – wir erstellen ein individuelles Angebot. Mit unserer 0%-Finanzierung ohne Anzahlung ist der Einstieg sehr einfach."
FÖRDERUNG: Kantonsabhängig. Sage: "Je nach Kanton gibt es unterschiedliche Förderprogramme – das klären wir in der Beratung."

═══════════════════════════════════════
GESPRÄCHSFÜHRUNG
═══════════════════════════════════════
Stelle nach jeder Antwort EINE gezielte Folgefrage:
- Zu Beginn: "Darf ich fragen – geht es um ein Einfamilienhaus, Mehrfamilienhaus oder ein Gewerbe?"
- Bei Interesse: "In welchem Kanton befinden Sie sich?"
- Bei Planung: "Haben Sie bereits eine Vorstellung wie viel Strom Sie selbst produzieren möchten?"

Nach 2-3 Nachrichten mit erkennbarem Interesse: Proaktiv Beratung anbieten.
NIE mehr als 2x auf Kontaktformular hinweisen.

═══════════════════════════════════════
EINWÄNDE ENTKRÄFTEN
═══════════════════════════════════════
"Zu teuer" → "Verstehe ich – deshalb zahlen Sie bei uns keinen Franken vor der Montage. Und unsere 0%-Finanzierung macht es nochmals einfacher."
"Lohnt sich nicht" → "Bei anderen Anbietern amortisiert sich eine Hybridanlage in 8-12 Jahren. Bei uns rechnen unsere Kunden mit 6-9 Jahren – danach produzieren Sie Strom praktisch gratis."
"Zu kompliziert" → "Wir kümmern uns um alles: Batterie, Montage, Gerüst, Inbetriebnahme, Planung, technische Anmeldungen, Förderabklärung, Fördergesuch, Beglaubigung und Dokumentation."
"Erstmal abwarten" → "Jedes Jahr ohne Anlage zahlen Sie weiterhin volle Strompreise. Förderprogramme sind zeitlich begrenzt – wann sie gekürzt werden hängt von politischen Entscheiden ab. Wer jetzt handelt sichert sich die besten Konditionen."
"Unsicher" → "Wir sind Swissolar-zertifiziert und versichert über Baloise."
"Ich schaue noch andere Anbieter an" → "Absolut sinnvoll. Fragen Sie konkret: Verlangen sie Anzahlung? Bieten sie 0%-Finanzierung? Ist das Gerüst inklusive?"

═══════════════════════════════════════
OFF-TOPIC ANFRAGEN
═══════════════════════════════════════
Sage freundlich: "Darüber kann ich leider nicht viel sagen – aber bei Solarenergie helfe ich Ihnen sehr gerne weiter."

═══════════════════════════════════════
ZWEI ARTEN VON KUNDEN
═══════════════════════════════════════
FALL A – NEUKUNDE (Interesse, Fragen, Offerte):
→ Weiterleiten zu: https://swiss-energy-partner.ch/kontakt
→ NIEMALS E-Mail nennen

FALL B – BESTEHENDER KUNDE MIT PROBLEM:
Erkennbar an: "Niemand meldet sich", "warte auf Offerte", "keine Antwort", "bin bereits Kunde", "meine Anlage", Frustration
→ Empathisch: "Das tut mir leid, das sollte nicht so sein!"
→ Dann: "Schreiben Sie uns direkt: contact@swiss-energy-partner.ch"
→ NIEMALS auf Kontaktformular verweisen bei Problemen

═══════════════════════════════════════
ABSOLUT KRITISCHE REGELN – NIEMALS BRECHEN
═══════════════════════════════════════
- MAX 2 SÄTZE pro Antwort plus eine Folgefrage. Nie mehr. Jeder Satz muss einen Mehrwert haben.
- EINE Folgefrage pro Antwort – nie zwei.
- Du bist ein CHATBOT – du kannst niemanden kontaktieren, niemanden anrufen, keine E-Mails senden. Sage NIEMALS "ich werde mich melden" oder "ich kontaktiere Sie". Das ist eine Lüge.
- Wenn jemand einen Termin will: Leite ihn zu https://swiss-energy-partner.ch/kontakt – dort bucht er selbst.
- Erfinde KEINE Fakten, Zahlen, Versprechen oder Aktionen die du nicht ausführen kannst.
- Schreibe natürlich – keine Aufzählungen bei einfachen Antworten.
- NIEMALS Neukunden auf E-Mail schicken.
- NIEMALS Bestandskunden mit Problemen auf Kontaktformular schicken.`;

// Erlaubte Origins für CORS
const ALLOWED_ORIGINS = [
  'https://swiss-energy-partner.ch',
  'https://www.swiss-energy-partner.ch',
  'https://solar-chatbot-orpin.vercel.app'
];

export default async function handler(req, res) {

  // CORS – erlaubt alle relevanten Origins
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST erlaubt' });
  }

  // IP – zuverlässig und nicht fälschbar über Vercel
  const ip = req.headers['x-real-ip']
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(200).json({ reply: 'Bitte warten Sie kurz und versuchen Sie es gleich erneut.' });
  }

  const { messages, sessionId } = req.body;

  // Input Validation
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Nachrichten erhalten' });
  }

  const MAX_MSG_LENGTH = 1000;
  const validMessages = messages.every(m =>
    m &&
    typeof m.role === 'string' &&
    typeof m.content === 'string' &&
    m.content.length <= MAX_MSG_LENGTH &&
    ['user', 'assistant'].includes(m.role)
  );

  if (!validMessages) {
    return res.status(400).json({ error: 'Ungültige Nachrichtenstruktur' });
  }

  // Gesprächsverlauf auf max 20 Nachrichten begrenzen
  // Sicherstellen dass erste Nachricht immer "user" ist (Anthropic-Anforderung)
  let limitedMessages = messages.slice(-20);
  if (limitedMessages[0]?.role === 'assistant') {
    limitedMessages = limitedMessages.slice(1);
  }
  if (limitedMessages.length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Nachrichten nach Validierung' });
  }

  const API_KEY      = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!API_KEY) return res.status(200).json({
    reply: 'Entschuldigung, der Assistent ist momentan nicht verfügbar. Bitte besuchen Sie: https://swiss-energy-partner.ch/kontakt'
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let anthropicResponse;
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 250,
          temperature: 0.3,
          system: SYSTEM_PROMPT,
          messages: limitedMessages
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    // HTTP Status prüfen bevor JSON parsen
    if (anthropicResponse.status === 429) {
      return res.status(200).json({
        reply: 'Im Moment sind wir sehr beschäftigt. Bitte versuchen Sie es gleich erneut oder besuchen Sie: https://swiss-energy-partner.ch/kontakt'
      });
    }

    if (!anthropicResponse.ok) {
      console.error('Anthropic API Error:', anthropicResponse.status);
      return res.status(200).json({
        reply: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut oder besuchen Sie: https://swiss-energy-partner.ch/kontakt'
      });
    }

    const data = await anthropicResponse.json();
    const rawReply = data.content?.[0]?.text || 'Keine Antwort erhalten.';
    const reply = validateReply(rawReply);

    // Supabase Logging
    if (SUPABASE_URL && SUPABASE_KEY) {
      const lastMsg = limitedMessages[limitedMessages.length - 1];
      const letzteNachricht = typeof lastMsg?.content === 'string'
        ? lastMsg.content
        : JSON.stringify(lastMsg?.content || '');
      const sid = sessionId || 'unbekannt';

      fetch(`${SUPABASE_URL}/rest/v1/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          frage: letzteNachricht,
          antwort: reply,
          session_id: sid,
          anzahl_nachrichten: limitedMessages.length
        })
      }).catch(err => console.error('Supabase Logging Fehler:', err));
    }

    return res.status(200).json({ reply });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(200).json({ reply: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.' });
    }
    console.error('Unbekannter Fehler:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
