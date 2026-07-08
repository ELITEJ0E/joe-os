export async function synthesizeSpeech(text: string): Promise<string | null> {
  // 1. PRIMARY: Piper TTS (Local, offline, open source)
  try {
    const piperRes = await fetch('/api/tts/piper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000) // Local might be slow depending on CPU
    });
    if (piperRes.ok) {
      const blob = await piperRes.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn("Piper TTS failed or not enabled (falling back to Pollinations):", e);
  }

  // 2. SECONDARY: Pollinations API (Free cloud fallback)
  try {
    const url = `https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?voice=onyx`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn("Pollinations TTS failed or timed out:", e);
  }

  // 3. FALLBACK: Web Speech API (Client-side browser voices)
  try {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      
      window.speechSynthesis.speak(utterance);
      return null; // Indicates handled directly
    }
  } catch (e) {
    console.warn("Web Speech API failed:", e);
  }
  
  return null;
}
