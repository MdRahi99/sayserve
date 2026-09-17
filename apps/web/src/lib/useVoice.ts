"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech input, using what the browser already has.
 *
 * The Web Speech API means no audio upload, no transcription bill and no
 * latency past the local recogniser. The trade is support: Chrome, Edge and
 * Safari have it, Firefox does not. So `supported` is exported and the button
 * simply does not appear where it would not work.
 *
 * The text always lands in the input box rather than being sent, so a misheard
 * word is corrected rather than ordered.
 */
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export function useVoice(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  handler.current = onText;

  useEffect(() => {
    const Ctor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) return;

    const instance: Recognition = new Ctor();
    instance.continuous = false;
    instance.interimResults = true;
    instance.lang = "en-GB";

    instance.onresult = (event: any) => {
      let text = "";
      let final = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
        if (event.results[i].isFinal) final = true;
      }
      handler.current(text.trim(), final);
    };
    instance.onerror = (event: any) => {
      setError(event.error === "not-allowed"
        ? "Microphone access was blocked."
        : "Could not hear that.");
      setListening(false);
    };
    instance.onend = () => setListening(false);

    recognition.current = instance;
    setSupported(true);

    return () => instance.stop();
  }, []);

  const start = useCallback(() => {
    if (!recognition.current || listening) return;
    setError(null);
    try {
      recognition.current.start();
      setListening(true);
    } catch {
      // Already running; harmless.
    }
  }, [listening]);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
