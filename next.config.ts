import type { NextConfig } from "next";

/**
 * assetPrefix absoluto em produção: faz os assets (_next/static) carregarem
 * sempre de conteudai.com.br. Necessário pro modo SUBDIRETÓRIO — quando o
 * blog é servido via reverse proxy no domínio do cliente (cliente.com.br/blog),
 * os assets precisam apontar pra nós, não pro domínio do cliente (que não tem
 * os arquivos). Em dev fica relativo (localhost).
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const useAbsoluteAssets =
  process.env.NODE_ENV === "production" && /^https:\/\//.test(APP_URL);

const nextConfig: NextConfig = {
  ...(useAbsoluteAssets ? { assetPrefix: APP_URL } : {}),
};

export default nextConfig;
