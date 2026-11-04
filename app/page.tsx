// app/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop when speech finishes
    recognition.interimResults = true; // Show text as you speak
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMessage("Listening... Speak your prompt clearly.");
    };

    recognition.onresult = (event: any) => {
      let liveText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        liveText += event.results[i][0].transcript;
      }
      setPrompt(liveText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatusMessage("Microphone access blocked. Please allow mic permissions in your browser.");
      } else if (event.error === "no-speech") {
        setStatusMessage("No speech detected. Click the mic and try speaking again.");
      } else if (event.error === "network") {
        setStatusMessage("Network error during speech recognition. Check your connection.");
      } else {
        setStatusMessage(`Audio error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // Trigger Image Generation
  const handleGenerate = async (textToUse?: string) => {
    const finalPrompt = textToUse || prompt;
    if (!finalPrompt.trim()) {
      setStatusMessage("Please speak or type a prompt first.");
      return;
    }

    setLoading(true);
    setStatusMessage("Generating your image with Stability AI...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation error");

      setImageUrl(data.image);
      setStatusMessage("Image generated successfully!");
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Voice Input
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setPrompt("");
      setStatusMessage("");
      recognitionRef.current.start();

      // Automatically trigger generation once user stops speaking
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setPrompt((currentPrompt) => {
          if (currentPrompt.trim()) {
            handleGenerate(currentPrompt);
          }
          return currentPrompt;
        });
      };
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice & Text Image Generator</h1>
          <p className="text-sm text-slate-400">
            Speak into the microphone or type your prompt to generate AI images automatically.
          </p>
        </div>

        {/* Input & Controls */}
        <div className="flex flex-col gap-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g., "A futuristic cyberpunk city at midnight"'
              disabled={loading}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 pr-24 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                title="Speak prompt"
                className={`p-2.5 rounded-lg border transition flex items-center justify-center ${
                  isListening
                    ? "bg-red-500 text-white border-red-400 animate-pulse"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
                }`}
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 min-h-[1.25rem]">
            <span>{statusMessage}</span>
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-1.5 rounded-lg transition"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Display Canvas */}
        <div className="w-full aspect-square bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={prompt} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="text-center text-slate-600 flex flex-col items-center gap-2">
              <svg className="w-10 h-10 stroke-current opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-sm">Generated artwork will show up here</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}