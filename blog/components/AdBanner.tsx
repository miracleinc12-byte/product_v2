"use client";

import { useEffect, useRef } from "react";

interface Props {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle";
  className?: string;
}

export default function AdBanner({ slot = "YOUR_AD_SLOT_ID", format = "auto", className = "" }: Props) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).adsbygoogle) {
        ((window as unknown as Record<string, unknown[]>).adsbygoogle = (window as unknown as Record<string, unknown[]>).adsbygoogle || []).push({});
      }
    } catch {}
  }, []);

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-8394607607930774"
        data-ad-slot="6474967174"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
