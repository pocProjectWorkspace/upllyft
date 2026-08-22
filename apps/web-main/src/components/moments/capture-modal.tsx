'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@upllyft/ui';
import { useCreateMoment, useInterpretMoment } from '@/hooks/use-moments';
import type { MomentCategory, MomentInterpretation } from '@/lib/api/moments';
import { CATEGORY_META, DOMAIN_LABELS } from './meta';

const ALL_DOMAINS = Object.keys(DOMAIN_LABELS);

interface CaptureModalProps {
  childId: string;
  childName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Two steps, per the handoff: (1) tell Mira — text or voice, nothing else required;
 * (2) Mira reflects back what she heard and PROPOSES a category + domain tags, which
 * the parent confirms or edits before anything is saved. Interpretation is never
 * auto-committed, and an AI failure degrades to a plain save, never a blocked one.
 */
export function CaptureModal({ childId, childName, open, onClose }: CaptureModalProps) {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<MomentCategory | null>(null);
  const [domainTags, setDomainTags] = useState<string[]>([]);
  const [place, setPlace] = useState('');
  const [interpretation, setInterpretation] = useState<MomentInterpretation | null>(null);
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const recognitionRef = useRef<any>(null);

  const interpret = useInterpretMoment(childId);
  const create = useCreateMoment(childId);

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!open) {
      setStep('input');
      setText('');
      setCategory(null);
      setDomainTags([]);
      setPlace('');
      setInterpretation(null);
      setSpeechError(null);
      setSaveError(false);
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function startListening() {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || 'en-US';
    setSpeechError(null);
    rec.onresult = (e: any) => {
      let heard = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) heard += e.results[i][0].transcript;
      }
      // A recognition failure mid-way keeps whatever was already transcribed — the
      // parent falls back to typing without losing anything.
      if (heard) setText((t) => (t ? `${t} ${heard}` : heard).trim());
    };
    rec.onerror = (e: any) => {
      setListening(false);
      // Whatever was already transcribed stays in the textarea — the parent falls back
      // to typing without losing anything (the handoff's required failure mode).
      setSpeechError(
        e?.error === 'not-allowed' || e?.error === 'service-not-allowed'
          ? 'I need microphone permission for that — check the browser prompt, or just type.'
          : "I couldn't hear that. Try again, or just type — either works.",
      );
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    setUsedVoice(true);
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
  }

  async function handleContinue() {
    const trimmed = text.trim();
    if (!trimmed) return;
    stopListening();
    try {
      const result = await interpret.mutateAsync(trimmed);
      setInterpretation(result);
      // Proposals pre-fill the confirm step; the parent's own chip choice wins.
      setCategory((c) => c ?? result.category);
      setDomainTags(result.domainTags);
      setPlace(result.place ?? '');
    } catch {
      setInterpretation(null);
    }
    setStep('confirm');
  }

  async function handleSave() {
    setSaveError(false);
    try {
      await create.mutateAsync({
        text: text.trim(),
        category: category ?? undefined,
        capturedVia: usedVoice ? 'VOICE' : 'TEXT',
        place: place.trim() || undefined,
        domainTags,
        interpretation: interpretation ? { whatHeard: interpretation.whatHeard } : undefined,
      });
      onClose();
    } catch {
      setSaveError(true);
    }
  }

  function toggleDomain(d: string) {
    setDomainTags((tags) => (tags.includes(d) ? tags.filter((t) => t !== d) : [...tags, d]));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'input' ? 'What happened?' : 'Got it.'}
            </h2>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1 -m-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'input' ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Tell Mira anything you noticed about {childName} — something good, difficult,
                different or simply worth remembering. Nothing else to fill in.
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                rows={4}
                placeholder="He asked for water on his own today…"
                className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />

              <div className="flex items-center gap-2 mt-3">
                {speechSupported && (
                  <button
                    onClick={listening ? stopListening : startListening}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      listening
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-teal-500'}`} />
                    {listening ? 'Stop — I heard you' : 'Speak instead'}
                  </button>
                )}
                <p className="text-xs text-gray-400">
                  Most parents take about 15 seconds. You can stop mid-sentence.
                </p>
              </div>
              {speechError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  {speechError}
                </p>
              )}

              <div className="mt-5">
                <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-2">OR START WITH</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_META) as MomentCategory[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory((cur) => (cur === c ? null : c))}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                        category === c
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                      }`}
                    >
                      {CATEGORY_META[c].chip}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full mt-6"
                disabled={!text.trim() || interpret.isPending}
                onClick={handleContinue}
              >
                {interpret.isPending ? 'Mira is reading…' : 'Continue'}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mt-3">
                <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-1">YOU SAID</p>
                <p className="text-sm text-gray-700 italic">“{text.trim()}”</p>
              </div>

              {interpretation && (
                <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-4 mt-3">
                  <p className="text-[11px] font-semibold tracking-wide text-teal-700 mb-1">WHAT I HEARD</p>
                  <p className="text-sm text-gray-700">{interpretation.whatHeard}</p>
                  {interpretation.followUp && (
                    <p className="text-xs text-gray-500 mt-2">{interpretation.followUp}</p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-2">
                  WHAT KIND OF MOMENT
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_META) as MomentCategory[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory((cur) => (cur === c ? null : c))}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                        category === c
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                      }`}
                    >
                      {CATEGORY_META[c].chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-2">
                  POSSIBLE CONNECTION — TAP TO CHANGE
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_DOMAINS.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDomain(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        domainTags.includes(d)
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {DOMAIN_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[11px] font-semibold tracking-wide text-gray-400 block mb-2">
                  WHERE (OPTIONAL)
                </label>
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Home, nursery, supermarket…"
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
                  That didn&apos;t save — nothing was lost. Please try again in a moment.
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep('input')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={create.isPending}
                  onClick={handleSave}
                >
                  {create.isPending ? 'Saving…' : 'Save moment'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
