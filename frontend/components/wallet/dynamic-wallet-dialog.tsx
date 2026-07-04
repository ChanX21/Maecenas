"use client";

import { useState } from "react";
import {
  useSendEmailOTP,
  useVerifyOTP
} from "@dynamic-labs-sdk/react-hooks";
import { CheckCircle2, LoaderCircle, Mail, WalletCards, X } from "lucide-react";

type DynamicWalletDialogProps = {
  address: string;
  email?: string;
  error?: string;
  isConfigured: boolean;
  isOpen: boolean;
  isProvisioning: boolean;
  onClose: () => void;
};

export function DynamicWalletDialog({
  address,
  email,
  error,
  isConfigured,
  isOpen,
  isProvisioning,
  onClose
}: DynamicWalletDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const {
    data: otpVerification,
    error: sendError,
    isPending: isSending,
    mutateAsync: sendEmailOTP,
    reset
  } = useSendEmailOTP();
  const {
    error: verifyError,
    isPending: isVerifying,
    mutateAsync: verifyOTP
  } = useVerifyOTP();

  if (!isOpen) return null;

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendEmailOTP({ email: emailInput.trim() });
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpVerification) return;
    await verifyOTP({
      otpVerification,
      verificationToken: verificationCode.trim()
    });
  }

  const visibleError =
    error ?? sendError?.message ?? verifyError?.message;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dynamic-wallet-title"
    >
      <div className="roman-panel relative w-full max-w-md p-6 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center border border-marble/10 text-muted transition hover:bg-marble/10 hover:text-cream"
          aria-label="Close wallet dialog"
        >
          <X size={17} />
        </button>

        <WalletCards className="text-cream" size={24} />
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Dynamic embedded wallet
        </p>
        <h2 id="dynamic-wallet-title" className="mt-2 font-display text-3xl text-cream">
          {address ? "Wallet ready" : "Enter the treasury"}
        </h2>

        {!isConfigured ? (
          <p className="mt-4 text-sm leading-6 text-danger">
            Set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID before connecting a wallet.
          </p>
        ) : address ? (
          <div className="mt-6">
            <div className="flex items-center gap-3 border border-success/30 bg-success/5 p-4">
              <CheckCircle2 className="shrink-0 text-success" size={20} />
              <div className="min-w-0">
                <p className="text-sm text-cream">{email ?? "Dynamic account"}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">{address}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="roman-button mt-5 w-full bg-cream px-5 py-3 font-mono text-xs font-semibold uppercase text-ink"
            >
              Continue
            </button>
          </div>
        ) : email || isProvisioning ? (
          <div className="mt-6 flex items-center gap-3 border border-marble/10 bg-ink-2 p-4">
            <LoaderCircle className="animate-spin text-cream" size={19} />
            <div>
              <p className="text-sm text-cream">Creating your embedded EVM wallet</p>
              <p className="mt-1 text-xs text-muted">Dynamic is provisioning a signing account.</p>
            </div>
          </div>
        ) : otpVerification ? (
          <form onSubmit={verifyCode} className="mt-6">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Verification code
              </span>
              <input
                autoFocus
                inputMode="numeric"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="123456"
                className="mt-2 w-full border border-marble/15 bg-ink-2 px-4 py-3 font-mono text-base text-cream outline-none transition focus:border-cream/50"
              />
            </label>
            <button
              type="submit"
              disabled={isVerifying || !verificationCode.trim()}
              className="roman-button mt-4 w-full bg-cream px-5 py-3 font-mono text-xs font-semibold uppercase text-ink disabled:opacity-50"
            >
              {isVerifying ? "Verifying..." : "Verify and create wallet"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setVerificationCode("");
              }}
              className="mt-3 w-full font-mono text-[10px] uppercase text-muted hover:text-cream"
            >
              Use another email
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode} className="mt-6">
            <p className="mb-4 text-sm leading-6 text-muted">
              Sign in by email. Dynamic creates an embedded EVM wallet for research funding and source receipts.
            </p>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Email address
              </span>
              <div className="mt-2 flex items-center border border-marble/15 bg-ink-2 px-3 focus-within:border-cream/50">
                <Mail size={16} className="text-muted" />
                <input
                  autoFocus
                  type="email"
                  required
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="scholar@example.com"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-cream outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={isSending || !emailInput.trim()}
              className="roman-button mt-4 w-full bg-cream px-5 py-3 font-mono text-xs font-semibold uppercase text-ink disabled:opacity-50"
            >
              {isSending ? "Sending code..." : "Continue with Dynamic"}
            </button>
          </form>
        )}

        {visibleError ? (
          <p role="alert" className="mt-4 border border-danger/40 bg-danger/10 p-3 text-sm text-red-200">
            {visibleError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
