import { type BlogCta, ctaHref } from "@/lib/blog/cta";

/** Bloco grande no fim do artigo e na home do blog. Cores vêm dos tokens da marca (var(--blog-*)). */
export function CtaBlock({ cta, compacto = false }: { cta: BlogCta; compacto?: boolean }) {
  const href = ctaHref(cta);
  const externo = /^https?:/.test(href);
  return (
    <aside
      className={`blog-cta not-prose rounded-2xl ${compacto ? "px-5 py-4 my-8" : "px-6 py-7 md:px-8 md:py-9 mt-12"}`}
      style={{ background: "var(--blog-primary)", color: "#fff" }}
    >
      <div className={`${compacto ? "" : "max-w-xl"}`}>
        <div className={`${compacto ? "text-lg" : "text-2xl md:text-3xl"} font-bold tracking-tight leading-tight`} style={{ fontFamily: "var(--blog-heading-font)" }}>{cta.titulo}</div>
        {!compacto && <p className="mt-2 opacity-90 leading-relaxed">{cta.texto}</p>}
        <div className={`flex flex-wrap items-center gap-3 ${compacto ? "mt-3" : "mt-5"}`}>
          <a href={href} target={externo ? "_blank" : undefined} rel={externo ? "noopener" : undefined}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-sm shadow-sm transition hover:opacity-90"
            style={{ background: "var(--blog-accent)", color: "var(--blog-primary)" }}>
            {cta.whatsapp && <WhatsIcon />}{cta.botao}
          </a>
          {cta.secundario && cta.secundario_url && (
            <a href={cta.secundario_url} target="_blank" rel="noopener" className="text-sm underline underline-offset-4 opacity-90 hover:opacity-100" style={{ color: "#fff" }}>{cta.secundario}</a>
          )}
        </div>
      </div>
    </aside>
  );
}

/** Barra fixa no rodapé em telas pequenas: o leitor de celular sempre tem o botão à mão. */
export function CtaBarraMobile({ cta }: { cta: BlogCta }) {
  const href = ctaHref(cta);
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
      <a href={href} target="_blank" rel="noopener" className="pointer-events-auto flex items-center justify-center gap-2 rounded-full h-12 font-semibold text-sm shadow-lg" style={{ background: "var(--blog-primary)", color: "#fff" }}>
        {cta.whatsapp && <WhatsIcon />}{cta.botao}
      </a>
    </div>
  );
}

function WhatsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.5 3.5 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.2c.2.2 2.2 3.4 5.4 4.7 2.7 1.1 3.2.9 3.8.8s1.8-.7 2-1.4.2-1.3.2-1.4-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm0-21.6A11.8 11.8 0 0 0 1.9 17.8L.2 24l6.3-1.7A11.8 11.8 0 1 0 12 .2z"/></svg>;
}
