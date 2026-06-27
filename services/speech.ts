import * as Speech from "expo-speech";

// Strip emoji, markdown and extra whitespace so the TTS engine reads clean,
// natural-sounding text instead of spelling out symbols.
const clean = (s: string): string =>
  (s || "")
    .replace(/[*_#`>~|]/g, "")
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

export interface SpeakHandlers {
  onStart?: () => void;
  onDone?: () => void;
}

// Speak the given text aloud, cancelling anything already playing first.
export const speak = (text: string, handlers: SpeakHandlers = {}): void => {
  const cleaned = clean(text);
  if (!cleaned) return;
  Speech.stop();
  Speech.speak(cleaned, {
    language: "en-US",
    rate: 0.95,
    pitch: 1.0,
    onStart: handlers.onStart,
    onDone: handlers.onDone,
    onStopped: handlers.onDone,
    onError: handlers.onDone,
  });
};

export const stopSpeaking = (): void => {
  Speech.stop();
};
