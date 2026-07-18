"use client";

import { useCallback, useRef, useState } from "react";
import Script from "next/script";
import { supabase } from "@/infra/supabase";
import { generateGoogleNonce } from "@/lib/googleAuth";

type CredentialResponse = {
  credential?: string;
};

type GoogleIdentityServices = {
  initialize: (options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce: string;
    ux_mode: "popup";
    use_fedcm_for_prompt: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      shape: "rectangular";
      theme: "outline";
      text: "signin_with";
      size: "large";
      logo_alignment: "left";
      locale: "ja";
      width: number;
    }
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityServices;
      };
    };
  }
}

const GOOGLE_CLIENT_SCRIPT = "https://accounts.google.com/gsi/client";

export function GoogleSignInButton({ className = "" }: { className?: string }) {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initializeGoogleSignIn = useCallback(async () => {
    const container = buttonContainerRef.current;
    const googleIdentity = window.google?.accounts.id;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!container || !googleIdentity) {
      setErrorMessage("Googleログインの読み込みに失敗しました。再読み込みしてください。");
      return;
    }
    if (!clientId) {
      setErrorMessage("Googleログインが設定されていません。");
      return;
    }

    try {
      const { nonce, hashedNonce } = await generateGoogleNonce();
      nonceRef.current = nonce;
      setErrorMessage(null);

      googleIdentity.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        ux_mode: "popup",
        use_fedcm_for_prompt: true,
        callback: async ({ credential }) => {
          const rawNonce = nonceRef.current;
          if (!credential || !rawNonce) {
            setErrorMessage("Googleログインを完了できませんでした。もう一度お試しください。");
            return;
          }

          setPending(true);
          setErrorMessage(null);
          try {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce: rawNonce,
            });
            if (error) throw error;
          } catch {
            setErrorMessage("ログインに失敗しました。もう一度お試しください。");
          } finally {
            setPending(false);
          }
        },
      });

      container.replaceChildren();
      googleIdentity.renderButton(container, {
        type: "standard",
        shape: "rectangular",
        theme: "outline",
        text: "signin_with",
        size: "large",
        logo_alignment: "left",
        locale: "ja",
        width: Math.min(container.clientWidth || 320, 400),
      });
    } catch {
      setErrorMessage("Googleログインの初期化に失敗しました。再読み込みしてください。");
    }
  }, []);

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`} aria-busy={pending}>
      <Script
        src={GOOGLE_CLIENT_SCRIPT}
        strategy="afterInteractive"
        onReady={() => void initializeGoogleSignIn()}
        onError={() =>
          setErrorMessage("Googleログインの読み込みに失敗しました。再読み込みしてください。")
        }
      />
      <div
        ref={buttonContainerRef}
        className={`flex min-h-10 w-full justify-center ${pending ? "pointer-events-none opacity-60" : ""}`}
      />
      {pending && (
        <p role="status" className="text-center text-sm text-muted">
          ログイン中...
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-center text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
