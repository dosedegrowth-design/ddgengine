"use client";

/**
 * RefCapture — lê ?ref=CODE da URL e salva em cookie (90 dias).
 *
 * O code persiste mesmo se o user navegar pra outras páginas antes de
 * cadastrar. O signup server action lê o cookie e propaga pra
 * attachReferralOnSignup() depois que a org é criada.
 *
 * Não renderiza nada — só roda 1x no mount.
 */
import { useEffect } from "react";

const COOKIE_NAME = "ddg_ref";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 90; // 90 dias

export function RefCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (!ref) return;

      // Sanitiza: alfanumérico até 16 chars
      const clean = ref.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase();
      if (!clean) return;

      // Seta cookie (SameSite=Lax pra funcionar em navegação entre subdomínios)
      document.cookie = `${COOKIE_NAME}=${clean}; Path=/; Max-Age=${COOKIE_MAX_AGE_S}; SameSite=Lax`;

      // Limpa o ?ref da URL pra não poluir compartilhamentos
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignorar se algo der errado — não pode quebrar o signup
    }
  }, []);

  return null;
}
