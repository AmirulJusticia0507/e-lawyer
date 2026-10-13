'use client';

import { useEffect, useRef } from 'react';

interface HCaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

export default function HCaptcha({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  size = 'normal',
}: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadScript = () => {
      if (scriptLoadedRef.current) {
        renderWidget();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://hcaptcha.com/1/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };
      script.onerror = () => {
        console.error('[HCaptcha] Failed to load script');
      };
      document.head.appendChild(script);
    };

    const renderWidget = () => {
      if (!containerRef.current || !window.hcaptcha) return;

      try {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
        });
      } catch (e) {
        console.error('[HCaptcha] Render error:', e);
      }
    };

    loadScript();

    return () => {
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try {
          window.hcaptcha.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size, onVerify, onExpire, onError]);

  return (
    <div
      ref={containerRef}
      className="hcaptcha-widget"
      data-sitekey={siteKey}
      data-theme={theme}
      data-size={size}
    />
  );
}

declare global {
  interface Window {
    hcaptcha: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => number;
      reset: (widgetId: number) => void;
      execute: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
    };
  }
}