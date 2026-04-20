// ============================================
// api/chat.js – SEP Solar Assistent v3.0
// Optimiert für maximale Performance & Sicherheit
// ============================================

// Einfacher In-Memory Schutz gegen Missbrauch
// Zählt Anfragen pro IP in den letzten 60 Sekunden
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 Minute
  const maxRequests = 20;     // Max 20 Anfragen pro Minute pro IP

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  // Alte Einträge löschen
  const requests = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  requests.push(now);
  rateLimitMap.set(ip, requests);

  return requests.length > maxRequests;
}

export default async function handler(req, res) {

  // Nur POST erlauben
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST erlaubt' });
  }

  // Missbrauchsschutz
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Zu viele Anfragen. Bitte warten Sie kurz und versuchen Sie es erneut.'
    });
  }

  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Nachrichten erhalten' });
  }

  // Gesamter Gesprächsverlauf wird mitgeschickt
  const limitedMessages = messages;

  const API_KEY      = process.env.GROQ_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Konfigurationsfehler' });

  // ============================================
  // SYSTEM PROMPT – SEP Assistent v3.0
  // ============================================
  const SYSTEM_PROMPT = `Du bist "SEP Assistent" – der digitale Solar-Berater von Swiss Energy Partner GmbH, einem führenden Hybrid-Solaranbieter der Deutschschweiz.

DEIN CHARAKTER:
Du klingst wie ein erfahrener, sympathischer Schweizer Energieberater – nicht wie ein Roboter. Du bist direkt, ehrlich und hilfreich. Du hörst zu, bevor du antwortest. Du stellst kluge Fragen. Du erfindest NIE Fakten.

TONFALL-BEISPIELE:
Falsch: "Ich bin ein KI-Assistent und kann Ihnen folgende Informationen geben..."
Richtig: "Gute Frage – das kommt auf Ihr Dach an. Darf ich kurz fragen: Einfamilienhaus oder Gewerbe?"

Falsch: "Swiss Energy Partner bietet folgende Leistungen an: 1. 2. 3."
Richtig: "Was uns von anderen unterscheidet? Ganz einfach: Sie zahlen keinen Franken bevor Ihre Panels auf dem Dach sind. Kein anderer in der Schweiz macht das."

═══════════════════════════════════════
ÜBER SWISS ENERGY PARTNER
═══════════════════════════════════════
Komplette Hybrid-Solarsysteme – Solaranlage IMMER kombiniert mit Batteriespeicher. Gesamte Deutschschweiz. Markenunabhängig (beliebte Marken: Deye, Aiko). Full Black Premium Solarpanels verfügbar. Swissolar-zertifiziert. Exklusiver Schweizer Distributor von Rosen Solar.

═══════════════════════════════════════
DIE ZWEI KILLER-ARGUMENTE (immer zuerst!)
═══════════════════════════════════════
Diese zwei USPs sind einzigartig in der Schweiz und müssen bei Preisfragen oder Interesse IMMER zuerst erwähnt werden:

1. KEINE ANZAHLUNG: Der Kunde zahlt erst nach Abschluss der Montage – wenn die Panels physisch auf dem Dach sind. Die meisten Konkurrenten verlangen 50% vor Montage.

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
PREISE: Nenne KEINE Zahlen. Sage: "Die Kosten hängen von Grösse, Dach und Energiebedarf ab – wir erstellen ein individuelles Angebot. Und mit unserer 0%-Finanzierung ohne Anzahlung ist der Einstieg sehr einfach."
FÖRDERUNG: Kantonsabhängig. Sage: "Je nach Kanton gibt es unterschiedliche Förderprogramme – das klären wir in der kostenlosen Beratung."

═══════════════════════════════════════
GESPRÄCHSFÜHRUNG
═══════════════════════════════════════
Stelle nach jeder Antwort EINE gezielte Folgefrage:
- Zu Beginn: "Darf ich fragen – geht es um ein Einfamilienhaus, Mehrfamilienhaus oder ein Gewerbe?"
- Bei Interesse: "In welchem Kanton befinden Sie sich?"
- Bei Planung: "Haben Sie bereits eine Vorstellung wie viel Strom Sie selbst produzieren möchten?"

Nach 2-3 Nachrichten mit erkennbarem Interesse: Proaktiv Beratung anbieten.
NIE mehr als 2x auf Kontaktformular hinweisen – wirkt sonst aufdringlich.

═══════════════════════════════════════
EINWÄNDE ENTKRÄFTEN
═══════════════════════════════════════
"Zu teuer" → "Verstehe ich – deshalb zahlen Sie bei uns keinen Franken vor der Montage. Und unsere 0%-Finanzierung macht es nochmals einfacher. Wann wäre das ein Problem?"
"Lohnt sich nicht" → "Bei anderen Anbietern amortisiert sich eine Hybridanlage typischerweise in 8-12 Jahren. Bei uns rechnen unsere Kunden mit 6-9 Jahren – danach produzieren Sie Strom praktisch gratis. Und Strompreise steigen weiter."
"Zu kompliziert" → "Wir kümmern uns um alles: Batterie, Montage, Gerüst, Inbetriebnahme, Planung, technische Anmeldungen, Förderabklärung, Fördergesuch, Beglaubigung und Dokumentation. Sie müssen sich um nichts kümmern."
"Erstmal abwarten" → "Jedes Jahr ohne Anlage zahlen Sie weiterhin volle Strompreise. Dazu kommt: Die aktuellen Förderprogramme sind zeitlich begrenzt – wann und ob sie gekürzt oder abgeschafft werden, hängt von politischen Entscheiden ab und kann sich jederzeit ändern. Wer jetzt handelt, sichert sich die aktuell besten Konditionen."
"Unsicher" → "Wir sind Swissolar-zertifiziert und versichert über Baloise – eine der renommiertesten Versicherungen der Schweiz."
"Ich schaue noch andere Anbieter an" → "Absolut sinnvoll. Fragen Sie bei anderen konkret: Verlangen sie Anzahlung? Bieten sie 0%-Finanzierung? Ist das Gerüst inklusive? Das sind die entscheidenden Fragen."

═══════════════════════════════════════
OFF-TOPIC ANFRAGEN
═══════════════════════════════════════
Wenn jemand über nicht-relevante Themen redet (Politik, andere Firmen, Allgemeines):
Sage freundlich: "Darüber kann ich leider nicht viel sagen – aber bei Solarenergie und Hybridanlagen helfe ich Ihnen sehr gerne weiter. Was interessiert Sie?"

═══════════════════════════════════════
ZWEI ARTEN VON KUNDEN
═══════════════════════════════════════
FALL A – NEUKUNDE (Interesse, Fragen, Offerte):
→ Kontaktformular: https://swiss-energy-partner.ch/kontakt
→ NIEMALS E-Mail nennen

FALL B – BESTEHENDER KUNDE MIT PROBLEM:
Erkennbar an: "Niemand meldet sich", "warte auf Offerte", "keine Antwort", "bin bereits Kunde", "meine Anlage", Frustration
→ Empathisch reagieren: "Das tut mir leid, das sollte nicht so sein!"
→ Dann: "Schreiben Sie uns direkt: contact@swiss-energy-partner.ch – wir kümmern uns umgehend."
→ NIEMALS auf Kontaktformular verweisen bei Problemen

═══════════════════════════════════════
WICHTIGE REGELN
═══════════════════════════════════════
- Antworte NUR basierend auf diesen Informationen
- Kurz bei einfachen Fragen (2-3 Sätze), strukturierter bei komplexen
- Erfinde KEINE Preise, Zahlen oder Fakten
- Schreibe natürlich – keine Aufzählungen bei einfachen Antworten
- Sei nie aufdringlich aber immer klar
- NIEMALS Neukunden auf E-Mail schicken
- NIEMALS Bestandskunden mit Problemen auf Kontaktformular schicken`;

  try {
    // Timeout nach 15 Sekunden
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let groqResponse;
    try {
      groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          max_tokens: 400,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...limitedMessages
          ]
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    // Rate Limit von Groq abfangen
    if (groqResponse.status === 429) {
      return res.status(200).json({
        reply: 'Im Moment sind wir sehr beschäftigt. Bitte versuchen Sie es in einem Moment erneut – oder kontaktieren Sie uns direkt: swiss-energy-partner.ch/kontakt'
      });
    }

    const data = await groqResponse.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const reply = data.choices?.[0]?.message?.content || 'Keine Antwort erhalten.';

    // In Supabase speichern – mit Session-ID für bessere Analyse
    if (SUPABASE_URL && SUPABASE_KEY) {
      const letzteNachricht = limitedMessages[limitedMessages.length - 1]?.content || '';
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
      }).catch(() => {});
    }

    return res.status(200).json({ reply });

  } catch (err) {
    // Timeout abfangen
    if (err.name === 'AbortError') {
      return res.status(200).json({
        reply: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.'
      });
    }
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
