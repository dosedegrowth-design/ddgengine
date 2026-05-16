/**
 * AudioRecorder — grava áudio do microfone com waveform + envia pro Whisper
 *
 * UX:
 * - Botão "🎤 Falar" grande
 * - Quando grava: waveform animado + timer + botões parar/cancelar
 * - Após parar: mostra "transcrevendo..." e depois retorna o texto
 * - Texto pode ser editado pelo usuário antes de finalizar
 *
 * Tech:
 * - MediaRecorder API nativo (sem libs)
 * - Web Audio API pra waveform (AnalyserNode + canvas)
 * - Formato: audio/webm;codecs=opus (desktop) ou audio/mp4 (Safari)
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Callback quando transcrição termina */
  onTranscribed: (text: string, audioBlob: Blob, durationSec: number) => void;
  /** Texto já transcrito anterior (pra mostrar como starting state) */
  initialText?: string;
  /** Compacto: usar dentro do QuizStep */
  compact?: boolean;
}

type State = "idle" | "recording" | "stopping" | "transcribing" | "done" | "error";

export function AudioRecorder({ onTranscribed, initialText, compact = false }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState(initialText ?? "");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalBlobRef = useRef<Blob | null>(null);
  const finalDurationRef = useRef<number>(0);

  // Cleanup global
  useEffect(() => {
    return () => {
      cleanupStream();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
  }

  function pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return "audio/webm";
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const durSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        finalBlobRef.current = blob;
        finalDurationRef.current = durSec;
        cleanupStream();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (timerRef.current) clearInterval(timerRef.current);

        await transcribe(blob);
      };

      mr.start();
      startTimeRef.current = Date.now();
      setState("recording");
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 250);

      // Waveform
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();

      // Vibração mobile (não bloqueia desktop)
      try {
        navigator.vibrate?.(40);
      } catch {
        /* ignore */
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Permissão de microfone negada";
      setError(msg);
      setState("error");
    }
  }

  function drawWaveform() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLen);

    function draw() {
      if (!canvas || !ctx || !analyser) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 40;
      const barWidth = w / barCount;
      const step = Math.floor(bufferLen / barCount);

      for (let i = 0; i < barCount; i++) {
        const v = dataArray[i * step] / 255;
        const barH = Math.max(2, v * h * 0.9);
        const x = i * barWidth;
        const y = (h - barH) / 2;
        ctx.fillStyle = `rgba(200, 255, 61, ${0.4 + v * 0.6})`;
        ctx.fillRect(x + 2, y, barWidth - 4, barH);
      }
    }

    draw();
  }

  function stopRecording() {
    if (state !== "recording") return;
    setState("stopping");
    mediaRecorderRef.current?.stop();
    try {
      navigator.vibrate?.(40);
    } catch {
      /* ignore */
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setState("idle");
    setDuration(0);
    finalBlobRef.current = null;
    audioChunksRef.current = [];
  }

  const transcribe = useCallback(
    async (blob: Blob) => {
      setState("transcribing");
      try {
        const fd = new FormData();
        fd.append("audio", blob, `audio-${Date.now()}.webm`);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { text: string; duration_sec: number };
        setTranscript(data.text);
        setState("done");
        onTranscribed(data.text, blob, data.duration_sec);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha na transcrição";
        setError(msg);
        setState("error");
      }
    },
    [onTranscribed]
  );

  function reset() {
    setState("idle");
    setError(null);
    setDuration(0);
    setTranscript("");
    finalBlobRef.current = null;
  }

  // ===== RENDER =====
  if (state === "idle" || state === "error") {
    return (
      <div className={cn("flex flex-col gap-2", compact ? "" : "p-4")}>
        <button
          type="button"
          onClick={startRecording}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ddg-paper/20 bg-ddg-paper/[0.04] hover:bg-ddg-lime/10 hover:border-ddg-lime/40 text-ddg-paper text-sm font-medium transition-colors"
        >
          <Mic className="w-4 h-4 text-ddg-lime" />
          {compact ? "Falar em vez de digitar" : "🎤 Falar em vez de digitar"}
        </button>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }

  if (state === "recording" || state === "stopping") {
    return (
      <div className={cn("rounded-lg border-2 border-ddg-lime/50 bg-ddg-ink/80 p-4", compact ? "" : "")}>
        <div className="flex items-center gap-3 mb-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-mono uppercase tracking-widest text-ddg-paper">
            Gravando
          </span>
          <span className="ml-auto text-sm font-mono tabular-nums text-ddg-paper">
            {formatDuration(duration)}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          className="w-full h-14 rounded mb-3"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelRecording}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-ddg-paper/20 text-ddg-paper/70 hover:text-ddg-paper hover:border-ddg-paper/40 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={state === "stopping"}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-ddg-lime text-ddg-ink text-sm font-bold border-2 border-ddg-ink shadow-[2px_2px_0_var(--ddg-ink)] hover:shadow-[3px_3px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Parar e transcrever
          </button>
        </div>
      </div>
    );
  }

  if (state === "transcribing") {
    return (
      <div className="rounded-lg border-2 border-ddg-lime/30 bg-ddg-ink/80 p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-ddg-lime animate-spin" />
        <span className="text-sm text-ddg-paper">Transcrevendo seu áudio…</span>
      </div>
    );
  }

  // state === "done"
  return (
    <div className="rounded-lg border-2 border-ddg-lime/30 bg-ddg-paper/[0.04] p-3 flex items-start gap-2">
      <Check className="w-4 h-4 text-ddg-lime mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono uppercase tracking-widest text-ddg-lime mb-1">
          Áudio transcrito · {formatDuration(finalDurationRef.current)}
        </p>
        <p className="text-sm text-ddg-paper/80 leading-relaxed">
          {transcript || "(vazio)"}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="text-xs text-ddg-paper/40 hover:text-ddg-paper underline shrink-0"
      >
        Regravar
      </button>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
