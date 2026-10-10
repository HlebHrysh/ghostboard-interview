'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Zap,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { GhostDetectiveLogo } from '@/components/ui/GhostDetectiveLogo';
import { useLocale } from '@/contexts/LocaleContext';
import { LangDropdown } from '@/components/ui/LangDropdown';
import { getSimulatorTranslations } from '@/lib/simulatorI18n';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

function SimulatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const sim = getSimulatorTranslations(locale);

  const planId = searchParams.get('planId') || 'pro_ua_monthly';
  const targetPlan = searchParams.get('targetPlan') || (planId.includes('lifetime') ? 'lifetime' : 'pro');
  const planName = searchParams.get('name') || (targetPlan === 'lifetime' ? 'Ghostboard Lifetime Founder Pass' : 'Ghostboard Pro Pass');
  const priceDisplay = searchParams.get('price') || (targetPlan === 'lifetime' ? '$99' : `$15${sim.moLabel}`);
  const amountCents = Number(searchParams.get('amount')) || (targetPlan === 'lifetime' ? 9900 : 1500);
  const userId = searchParams.get('userId') || 'guest_user';
  const defaultEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(defaultEmail);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardHolder, setCardHolder] = useState('Senior Developer');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'declined'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const TEST_CARDS = [
    { label: sim.testCards.successLabel, number: '4242 4242 4242 4242', status: 'ok', desc: sim.testCards.successDesc },
    { label: sim.testCards.insufficientLabel, number: '4000 0000 0000 9995', status: 'insufficient', desc: 'Code: insufficient_funds' },
    { label: sim.testCards.declinedLabel, number: '4000 0000 0000 0002', status: 'declined', desc: 'Code: card_declined' },
  ];

  const handleSelectTestCard = (number: string) => {
    setCardNumber(number);
    setPaymentStatus('idle');
    setErrorMessage('');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentStatus('idle');
    setErrorMessage('');

    const cleanCard = cardNumber.replace(/\s+/g, '');

    // 1. Check card conditions
    setProcessStep(sim.steps.step1);
    await new Promise((r) => setTimeout(r, 600));

    setProcessStep(sim.steps.step2);
    await new Promise((r) => setTimeout(r, 700));

    if (cleanCard.endsWith('0002')) {
      setIsProcessing(false);
      setPaymentStatus('declined');
      setErrorMessage(
        sim.toasts.declined
      );
      toast.error(sim.toasts.declined);
      return;
    }

    if (cleanCard.endsWith('9995')) {
      setIsProcessing(false);
      setPaymentStatus('declined');
      setErrorMessage(
        sim.toasts.insufficient
      );
      toast.error(sim.toasts.insufficient);
      return;
    }

    // 3. Dispatch webhook to our real webhook handler
    setProcessStep(sim.steps.step3);
    try {
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_' + Date.now().toString(36),
            client_reference_id: userId,
            customer_email: email,
            amount_total: amountCents,
            currency: 'usd',
            metadata: {
              userId,
              userEmail: email,
              planId,
              targetPlan,
            },
          },
        },
      };

      await fetch('/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
    } catch (err) {
      console.warn('Webhook simulation non-blocking error:', err);
    }

    setProcessStep(sim.steps.step4);
    await new Promise((r) => setTimeout(r, 600));

    // Persist plan in localStorage for instant front-end hydration
    try {
      localStorage.setItem('ghostboard_plan', targetPlan);
    } catch {}

    setPaymentStatus('success');
    toast.success(sim.toasts.success);

    setTimeout(() => {
      router.push(`/interview?upgrade=success&plan=${targetPlan}`);
    }, 1500);
  };

  return (
    <SubpageStripesContainer pattern="blueprint" className="min-h-screen flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{sim.backToPricing}</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <GhostDetectiveLogo size="mini" />
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-xs font-black tracking-widest text-zinc-200">
              GHOSTBOARD PAYMENTS
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/20 text-[10px] font-mono">
              DEV SANDBOX MODE
            </span>
          </div>
          <LangDropdown />
        </div>
      </header>

      {/* Main Checkout Viewport */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order Summary */}
          <div className="lg:col-span-5 rounded-3xl bg-zinc-950/80 border border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  {sim.orderSummaryTitle}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>256-BIT SSL</span>
                </span>
              </div>

              <h2 className="text-2xl font-black text-white font-sans tracking-tight mb-2">
                {planName}
              </h2>

              <div className="text-4xl font-mono font-black text-white my-4">
                {priceDisplay}
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5 text-xs text-zinc-300 font-sans">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>{sim.features.unlimited}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>{sim.features.deepgram}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>{sim.features.ocr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>{sim.features.teleprompter}</span>
                </div>
                {targetPlan === 'lifetime' && (
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Sparkles className="w-4 h-4 shrink-0 fill-white" />
                    <span>{sim.features.lifetime}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>{sim.totalDue}</span>
              <span className="text-lg font-bold text-white">{priceDisplay}</span>
            </div>
          </div>

          {/* Right Column: Stripe Interactive Form */}
          <div className="lg:col-span-7 rounded-3xl bg-zinc-950/90 border border-white/20 p-6 sm:p-8 shadow-2xl relative backdrop-blur-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white font-sans">
                  {sim.cardPaymentTitle}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">Powered by Stripe</span>
            </div>

            {/* Test Cards Quick Selector */}
            <div className="mb-6 p-4 rounded-2xl bg-zinc-900/80 border border-white/10">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                <span>{sim.presetsTitle}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TEST_CARDS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectTestCard(c.number)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer ${
                      cardNumber === c.number
                        ? 'bg-white/15 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        : 'bg-black/40 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1 text-[11px]">
                      <span className={c.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>●</span>
                      <span>{c.status === 'ok' ? sim.testCards.successTag : c.status === 'insufficient' ? sim.testCards.insufficientTag : sim.testCards.declinedTag}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 truncate">{c.number}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <div className="font-bold font-mono uppercase text-[10px]">{sim.errorTitle}</div>
                  <div className="mt-0.5">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Success State */}
            {paymentStatus === 'success' && (
              <div className="mb-6 p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-center animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-bounce" />
                <h4 className="text-lg font-bold text-white">{sim.successTitle}</h4>
                <p className="text-xs text-zinc-300 mt-1">
                  {sim.successDesc(targetPlan === 'lifetime' ? 'Lifetime Founder' : 'Pro Unlimited')}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  {sim.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  {sim.cardNumberLabel}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-black/60 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-sm focus:outline-none transition-colors tracking-widest"
                  />
                  <CreditCard className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    {sim.expiryLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-sm focus:outline-none transition-colors text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    {sim.cvcLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="CVC"
                    maxLength={4}
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-sm focus:outline-none transition-colors text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  {sim.holderLabel}
                </label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="FIRSTNAME LASTNAME"
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/20 text-white font-mono text-sm focus:outline-none transition-colors uppercase"
                />
              </div>

              {/* Live Processing Indicator */}
              {isProcessing && (
                <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-zinc-200 flex items-center gap-2 animate-pulse">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>{processStep}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing || paymentStatus === 'success'}
                className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm font-mono shadow-[0_0_35px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50 mt-4"
              >
                <Lock className="w-4 h-4 fill-black" />
                <span>
                  {isProcessing
                    ? sim.processingBtn
                    : paymentStatus === 'success'
                    ? sim.paidBtn
                    : sim.payBtn(priceDisplay)}
                </span>
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-white" /> {sim.securedBy}
              </span>
              <span>•</span>
              <span>{sim.sandboxDisclaimer}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs font-mono text-zinc-600 py-6 border-t border-white/5">
        Ghostboard Secure Payments • PCI-DSS Level 1 Compliant Simulator
      </footer>
    </SubpageStripesContainer>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-8">Loading payment gateway...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}
