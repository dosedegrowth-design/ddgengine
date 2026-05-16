/**
 * Whisper — transcrição de áudio via OpenAI
 *
 * Modelo: whisper-1
 * Custo: ~$0.006/min de áudio
 * Limite: 25MB por request
 * Idioma forçado: pt (português)
 */
import OpenAI from "openai";

let _client: OpenAI | null = null;

function client() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface TranscribeResult {
  text: string;
  duration_sec: number;
  language: string;
}

/**
 * Transcreve áudio (File ou Blob) usando Whisper.
 * Aceita webm, mp4, mp3, wav, m4a.
 */
export async function transcribeAudio(
  audio: File | Blob,
  filename = "audio.webm"
): Promise<TranscribeResult> {
  const file = audio instanceof File ? audio : new File([audio], filename, { type: audio.type });

  // Verifica tamanho (limite 25MB Whisper)
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Áudio muito grande (limite: 25MB)");
  }

  const response = await client().audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "pt",
    response_format: "verbose_json",
  });

  // verbose_json retorna duration; cast pra acessar
  const verbose = response as unknown as {
    text: string;
    duration: number;
    language: string;
  };

  return {
    text: verbose.text.trim(),
    duration_sec: Math.round(verbose.duration ?? 0),
    language: verbose.language ?? "pt",
  };
}
