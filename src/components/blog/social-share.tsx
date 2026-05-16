"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Mail, MessageCircle, Share2, Send } from "lucide-react";

interface Props {
  url: string;
  title: string;
}

export function SocialShare({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const links = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encTitle}%20${encUrl}`,
    },
    {
      name: "LinkedIn",
      icon: Share2,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
    },
    {
      name: "Twitter / X",
      icon: Send,
      href: `https://twitter.com/intent/tweet?text=${encTitle}&url=${encUrl}`,
    },
    {
      name: "Email",
      icon: Mail,
      href: `mailto:?subject=${encTitle}&body=${encUrl}`,
    },
  ];

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-2">Compartilhar:</span>
      {links.map(({ name, icon: Icon, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label={`Compartilhar no ${name}`}
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}
      <button
        onClick={copyLink}
        className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Copiar link"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
