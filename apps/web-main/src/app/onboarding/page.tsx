'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  completeOnboarding,
  getMyProfile,
  type CompleteOnboardingPayload,
  type OnboardingData,
} from '@/lib/api/profiles';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ──────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const PRIMARY_REASONS = [
  {
    id: 'recent-diagnosis',
    emoji: '\uD83D\uDD0D',
    title: 'My child recently received a diagnosis',
    subtitle: "We'll help you understand what comes next",
  },
  {
    id: 'screen-development',
    emoji: '\uD83D\uDCCB',
    title: "I want to screen my child's development",
    subtitle: 'Our quick screening can highlight areas to focus on',
  },
  {
    id: 'find-therapist',
    emoji: '\uD83D\uDC68\u200D\u2695\uFE0F',
    title: "I'm looking for the right therapist",
    subtitle: "We'll connect you with verified professionals",
  },
  {
    id: 'connect-parents',
    emoji: '\uD83D\uDCAC',
    title: 'I want to connect with other parents',
    subtitle: 'Join a supportive community of parents like you',
  },
  {
    id: 'just-exploring',
    emoji: '\uD83C\uDF1F',
    title: "I'm just exploring",
    subtitle: "No pressure — we'll show you around",
  },
];

const EMPATHETIC_RESPONSES: Record<string, string> = {
  'recent-diagnosis':
    "That can be a lot to process. We're here to help you make sense of it all.",
  'screen-development':
    "Screening early is one of the best things you can do. We'll make it easy.",
  'find-therapist':
    "Finding the right person makes all the difference. We'll help you find them.",
  'connect-parents':
    "You're not alone in this. There's a whole community waiting for you.",
  'just-exploring':
    'No rush at all. Take your time and explore at your own pace.',
};

const CONCERNS = [
  {
    id: "Understanding my child's development",
    emoji: '\uD83E\uDDE0',
    label: "Understanding my child's development",
  },
  {
    id: 'Speech and communication',
    emoji: '\uD83D\uDDE3\uFE0F',
    label: 'Speech and communication',
  },
  {
    id: 'Social skills and behavior',
    emoji: '\uD83E\uDD1D',
    label: 'Social skills and behavior',
  },
  {
    id: 'Learning and school readiness',
    emoji: '\uD83D\uDCDA',
    label: 'Learning and school readiness',
  },
  {
    id: 'Motor skills and physical development',
    emoji: '\uD83C\uDFC3',
    label: 'Motor skills and physical development',
  },
  {
    id: 'Managing daily routines and sensory needs',
    emoji: '\uD83D\uDE30',
    label: 'Managing daily routines and sensory needs',
  },
  {
    id: 'Finding the right support and therapies',
    emoji: '\uD83D\uDCAA',
    label: 'Finding the right support and therapies',
  },
];

const COMMON_CONDITIONS = [
  'Autism/ASD',
  'ADHD',
  'Speech Delay',
  'Down Syndrome',
  'Cerebral Palsy',
  'Sensory Processing',
  'Learning Disability',
  'Other',
];

const MODULE_INFO: Record<
  string,
  { url: string; icon: string; description: string }
> = {
  screening: {
    url: APP_URLS.screening,
    icon: 'clipboard',
    description: 'Track developmental milestones and get insights',
  },
  booking: {
    url: APP_URLS.booking,
    icon: 'calendar',
    description: 'Find and book sessions with verified professionals',
  },
  community: {
    url: APP_URLS.community,
    icon: 'users',
    description: 'Connect with other parents and share experiences',
  },
  resources: {
    url: APP_URLS.resources,
    icon: 'book',
    description: 'AI-powered worksheets and learning resources',
  },
};

const RECOMMENDATION_COPY: Record<string, string> = {
  screening:
    "A quick developmental screening can give you a clear picture of where your child is thriving and where they might need some extra support. It only takes about 15 minutes.",
  booking:
    "We'll connect you with verified therapists who specialize in your child's needs. You can browse profiles, read reviews, and book a session that works for you.",
  community:
    "Thousands of parents just like you are sharing their experiences, asking questions, and supporting each other every day. Jump in \u2014 they'd love to hear from you.",
  insights:
    "We'll analyze your child's profile and give you a personalized developmental insight with clear next steps, relevant resources, and professional recommendations.",
};

const STEP_BACKGROUNDS = [
  '', // unused (0-indexed pad)
  'from-teal-50/30 to-white',
  'from-teal-50/40 to-white',
  'from-blue-50/30 to-white',
  'from-purple-50/30 to-white',
  'from-teal-50/50 to-white',
];

// ── Framer Motion Variants ─────────────────────────────────────────

const stepVariants = {
  enterForward: { x: 30, opacity: 0 },
  enterBack: { x: -30, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitForward: { x: -30, opacity: 0 },
  exitBack: { x: 30, opacity: 0 },
};

const cardSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
};

const fadeUpVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// ── Component ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [saving, setSaving] = useState(false);

  // Step 2
  const [primaryReason, setPrimaryReason] = useState('');

  // Step 3
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [hasConditions, setHasConditions] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [hasExistingChild, setHasExistingChild] = useState(false);

  // Step 4
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  // Step 5
  const [recommendation, setRecommendation] = useState<OnboardingData | null>(
    null,
  );

  // Pre-fill child info if profile exists
  useEffect(() => {
    if (user && isAuthenticated) {
      getMyProfile()
        .then((profile) => {
          if (profile.children && profile.children.length > 0) {
            const child = profile.children[0];
            setChildName(child.firstName);
            setChildDob(child.dateOfBirth?.split('T')[0] || '');
            setChildGender(child.gender || '');
            setHasExistingChild(true);
          }
        })
        .catch(() => {});
    }
  }, [user, isAuthenticated]);

  const goForward = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSkip = useCallback(async () => {
    setSaving(true);
    try {
      await completeOnboarding({
        primaryReason: primaryReason || 'just-exploring',
        concerns: selectedConcerns,
        ...(childName && childDob
          ? {
              child: {
                firstName: childName,
                dateOfBirth: childDob,
                gender: childGender || undefined,
                hasConditions,
                conditions: hasConditions ? selectedConditions : undefined,
              },
            }
          : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.push('/');
    } catch {
      router.push('/');
    } finally {
      setSaving(false);
    }
  }, [
    primaryReason,
    selectedConcerns,
    childName,
    childDob,
    childGender,
    hasConditions,
    selectedConditions,
    queryClient,
    router,
  ]);

  const handleComplete = useCallback(
    async (navigateTo?: string) => {
      setSaving(true);
      try {
        const payload: CompleteOnboardingPayload = {
          primaryReason: primaryReason || 'just-exploring',
          concerns: selectedConcerns,
        };

        if (childName && childDob && !hasExistingChild) {
          payload.child = {
            firstName: childName,
            dateOfBirth: childDob,
            gender: childGender || undefined,
            hasConditions,
            conditions: hasConditions ? selectedConditions : undefined,
          };
        }

        const result = await completeOnboarding(payload);
        setRecommendation(result.onboardingData);
        await queryClient.invalidateQueries({ queryKey: ['profile'] });

        if (navigateTo) {
          toast({
            title: 'Welcome to Upllyft!',
            description: "You're all set. Let's get started!",
          });
          window.location.href = navigateTo;
        }
      } catch {
        toast({
          title: 'Something went wrong',
          description:
            "Don't worry \u2014 we saved your progress. You can continue from the dashboard.",
          variant: 'destructive',
        });
        router.push('/');
      } finally {
        setSaving(false);
      }
    },
    [
      primaryReason,
      selectedConcerns,
      childName,
      childDob,
      childGender,
      hasConditions,
      selectedConditions,
      hasExistingChild,
      queryClient,
      router,
      toast,
    ],
  );

  // Step 5: trigger completion on mount
  useEffect(() => {
    if (step === 5 && !recommendation && !saving) {
      handleComplete();
    }
  }, [step, recommendation, saving, handleComplete]);

  function toggleConcern(id: string) {
    setSelectedConcerns((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function toggleCondition(cond: string) {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond],
    );
  }

  // Concern supportive message
  const concernMessage = useMemo(() => {
    if (selectedConcerns.length === 1) {
      const area = selectedConcerns[0].toLowerCase();
      return `Got it. We'll make sure ${area} is front and center for you.`;
    }
    if (selectedConcerns.length >= 2) {
      return "Those are really important areas. We'll help you tackle them one step at a time.";
    }
    return '';
  }, [selectedConcerns]);

  // ── Auth guard ─────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  // ── Render ─────────────────────────────────────────────────────

  const bgGradient = STEP_BACKGROUNDS[step] || STEP_BACKGROUNDS[1];

  return (
    <div
      className={`min-h-screen flex flex-col bg-gradient-to-b ${bgGradient} transition-all duration-500`}
    >
      {/* Logo */}
      <div className="pt-8 pb-4 flex justify-center relative">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Upllyft</span>
        </motion.div>

        {/* Back arrow */}
        <AnimatePresence>
          {step > 1 && step < 5 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={goBack}
              className="absolute left-6 top-8 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial={direction === 'forward' ? 'enterForward' : 'enterBack'}
            animate="center"
            exit={direction === 'forward' ? 'exitForward' : 'exitBack'}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            {/* ── Step 1: Welcome ──────────────────────────────── */}
            {step === 1 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="mb-6 flex justify-center"
                >
                  <WavingHand />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="text-3xl font-bold text-gray-900 mb-3"
                >
                  Welcome to Upllyft{' '}
                  <span role="img" aria-label="yellow heart">
                    {'\uD83D\uDC9B'}
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed"
                >
                  We&apos;re so glad you&apos;re here. Every great journey starts
                  with a single step &mdash; and you&apos;ve just taken yours.
                </motion.p>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(13,148,136,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goForward}
                  className="bg-gradient-to-r from-teal-400 to-teal-600 text-white rounded-xl px-10 py-4 text-lg font-semibold shadow-lg"
                >
                  Let&apos;s Get Started
                </motion.button>
              </div>
            )}

            {/* ── Step 2: What brings you here ─────────────────── */}
            {step === 2 && (
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.4 }}
                  className="flex justify-center mb-6"
                >
                  <CompassIllustration />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  What brings you here today?
                </h2>
                <p className="text-gray-500 text-center mb-8">
                  There&apos;s no wrong answer. This just helps us show you the
                  most helpful things first.
                </p>

                <div className="space-y-3">
                  {PRIMARY_REASONS.map((reason, i) => {
                    const selected = primaryReason === reason.id;
                    return (
                      <motion.button
                        key={reason.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        animate-selected={selected}
                        onClick={() => setPrimaryReason(reason.id)}
                        className={`w-full text-left rounded-2xl border-2 p-5 transition-colors duration-200 relative ${
                          selected
                            ? 'border-teal-500 bg-teal-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <span className="text-2xl flex-shrink-0 mt-0.5">
                            {reason.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold ${selected ? 'text-teal-700' : 'text-gray-900'}`}
                            >
                              {reason.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {reason.subtitle}
                            </p>
                          </div>
                          <AnimatePresence>
                            {selected && (
                              <motion.svg
                                variants={checkmarkVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Empathetic response */}
                <AnimatePresence>
                  {primaryReason && EMPATHETIC_RESPONSES[primaryReason] && (
                    <motion.p
                      key={primaryReason}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ delay: 0.2, duration: 0.35 }}
                      className="text-center text-teal-700 bg-teal-50/60 rounded-xl px-4 py-3 mt-5 text-sm italic"
                    >
                      {EMPATHETIC_RESPONSES[primaryReason]}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Continue button */}
                <AnimatePresence>
                  {primaryReason && (
                    <motion.div
                      variants={fadeUpVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.3 }}
                      className="mt-8 text-center"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(13,148,136,0.25)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={goForward}
                        className="bg-gradient-to-r from-teal-400 to-teal-600 text-white rounded-xl px-8 py-3 font-semibold shadow-md"
                      >
                        Continue
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Step 3: About your child ─────────────────────── */}
            {step === 3 && (
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.4 }}
                  className="flex justify-center mb-6"
                >
                  <HeartsIllustration />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  Tell us a little about your child
                </h2>
                <p className="text-gray-500 text-center mb-8">
                  This helps us personalize everything &mdash; from screenings
                  to resources to the right therapists.
                </p>

                {hasExistingChild && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-4 text-center"
                  >
                    <p className="text-sm text-teal-700">
                      We found <strong>{childName}</strong>&apos;s profile. You
                      can update their info below or continue as-is.
                    </p>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Child&apos;s first name
                    </label>
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="What should we call them?"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date of birth
                    </label>
                    <input
                      type="date"
                      value={childDob}
                      onChange={(e) => setChildDob(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Gender{' '}
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <select
                      value={childGender}
                      onChange={(e) => setChildGender(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-shadow"
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer py-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={hasConditions}
                        onClick={() => setHasConditions(!hasConditions)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          hasConditions ? 'bg-teal-500' : 'bg-gray-200'
                        }`}
                      >
                        <motion.span
                          layout
                          transition={cardSpring}
                          className="inline-block h-4 w-4 rounded-full bg-white"
                          style={{
                            marginLeft: hasConditions ? '24px' : '4px',
                          }}
                        />
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        Has your child been diagnosed with or suspected of
                        having any conditions?
                      </span>
                    </label>
                  </div>

                  <AnimatePresence>
                    {hasConditions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-teal-600 mb-3 italic">
                          This helps us connect you with the most relevant
                          support and communities.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {COMMON_CONDITIONS.map((cond) => {
                            const selected =
                              selectedConditions.includes(cond);
                            return (
                              <motion.button
                                key={cond}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleCondition(cond)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                  selected
                                    ? 'bg-teal-100 text-teal-700 border border-teal-300'
                                    : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                                }`}
                              >
                                <AnimatePresence mode="wait">
                                  {selected && (
                                    <motion.svg
                                      key="check"
                                      initial={{ scale: 0, width: 0, marginRight: 0 }}
                                      animate={{ scale: 1, width: 14, marginRight: 4 }}
                                      exit={{ scale: 0, width: 0, marginRight: 0 }}
                                      className="inline -mt-0.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      height={14}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </motion.svg>
                                  )}
                                </AnimatePresence>
                                {cond}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-gray-400 mt-6 text-center"
                >
                  Don&apos;t worry about getting everything perfect. You can
                  always update this later.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-8 text-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(13,148,136,0.25)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={goForward}
                    className="bg-gradient-to-r from-teal-400 to-teal-600 text-white rounded-xl px-8 py-3 font-semibold shadow-md"
                  >
                    Continue
                  </motion.button>
                </motion.div>
              </div>
            )}

            {/* ── Step 4: Biggest concerns ─────────────────────── */}
            {step === 4 && (
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.4 }}
                  className="flex justify-center mb-6"
                >
                  <LightbulbIllustration />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  What matters most to you right now?
                </h2>
                <p className="text-gray-500 text-center mb-8">
                  Pick up to 3 areas you&apos;d like to focus on first.
                  You&apos;ll have access to everything regardless.
                </p>

                <div className="space-y-3">
                  {CONCERNS.map((concern, i) => {
                    const selected = selectedConcerns.includes(concern.id);
                    return (
                      <motion.button
                        key={concern.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.1 + i * 0.05,
                          duration: 0.3,
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleConcern(concern.id)}
                        className={`w-full text-left rounded-2xl border-2 p-4 transition-colors duration-200 relative ${
                          selected
                            ? 'border-teal-500 bg-teal-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">
                            {concern.emoji}
                          </span>
                          <span
                            className={`font-medium flex-1 ${selected ? 'text-teal-700' : 'text-gray-900'}`}
                          >
                            {concern.label}
                          </span>
                          <AnimatePresence>
                            {selected && (
                              <motion.svg
                                variants={checkmarkVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-5 h-5 text-teal-600 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Supportive message */}
                <AnimatePresence>
                  {concernMessage && (
                    <motion.p
                      key={selectedConcerns.length}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                      className="text-center text-teal-700 bg-teal-50/60 rounded-xl px-4 py-3 mt-5 text-sm italic"
                    >
                      {concernMessage}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Continue */}
                <AnimatePresence>
                  {selectedConcerns.length > 0 && (
                    <motion.div
                      variants={fadeUpVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.3 }}
                      className="mt-8 text-center"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(13,148,136,0.25)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={goForward}
                        className="bg-gradient-to-r from-teal-400 to-teal-600 text-white rounded-xl px-8 py-3 font-semibold shadow-md"
                      >
                        Continue
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Step 5: Meet Mira ────────────────────────────── */}
            {step === 5 && (
              <div>
                {!recommendation ? (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: 'linear',
                      }}
                      className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-500">
                      Personalizing your experience...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mira Avatar */}
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                      className="flex justify-center mb-6"
                    >
                      <div className="relative">
                        <motion.div
                          animate={{ scale: [1, 1.08, 1] }}
                          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                          className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-teal-400 flex items-center justify-center shadow-xl ring-4 ring-teal-200/60"
                        >
                          <span className="text-white font-bold text-3xl">M</span>
                        </motion.div>
                        {/* Glow ring */}
                        <motion.div
                          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                          className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl -z-10"
                        />
                      </div>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-2xl font-bold text-gray-900 text-center mb-2"
                    >
                      Meet Mira &mdash; your developmental guide
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="text-gray-500 text-center mb-8 max-w-sm mx-auto leading-relaxed"
                    >
                      {childName
                        ? `Mira already knows about ${childName} and will help you figure out the best next steps.`
                        : "Mira will help you figure out the best next steps for your child."}
                    </motion.p>

                    {/* Talk to Mira CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="text-center mb-6"
                    >
                      <motion.button
                        whileHover={{ scale: 1.03, boxShadow: '0 12px 36px rgba(13,148,136,0.35)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          // Store handoff data for Mira
                          const handoff = {
                            childName: childName || undefined,
                            childAge: childDob ? calculateChildAge(childDob) : undefined,
                            concerns: selectedConcerns,
                            primaryGoal: primaryReason,
                          };
                          localStorage.setItem('mira_onboarding_handoff', JSON.stringify(handoff));
                          router.push('/');
                        }}
                        disabled={saving}
                        className="bg-gradient-to-r from-teal-400 to-teal-600 text-white rounded-xl px-10 py-4 text-lg font-semibold shadow-lg"
                      >
                        Talk to Mira
                      </motion.button>
                    </motion.div>

                    {/* Secondary: explore on your own */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.65 }}
                      className="text-center mb-10"
                    >
                      <button
                        onClick={() => router.push('/')}
                        className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Or explore on your own &rarr;
                      </button>
                    </motion.div>

                    {/* Module cards — secondary access */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.75 }}
                      className="text-sm text-gray-400 mb-4 text-center"
                    >
                      You also have access to:
                    </motion.p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(MODULE_INFO).map(([key, info], i) => (
                        <motion.a
                          key={key}
                          href={info.url}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 + i * 0.08 }}
                          whileHover={{
                            scale: 1.05,
                            borderColor: 'rgb(94 234 212)',
                          }}
                          className="bg-white rounded-xl border border-gray-200 p-3 text-center transition-shadow hover:shadow-md"
                        >
                          <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                            <ModuleIcon name={info.icon} />
                          </div>
                          <p className="text-xs font-medium text-gray-900 capitalize">
                            {key === 'booking' ? 'Therapists' : key}
                          </p>
                        </motion.a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots + skip */}
      <div className="pb-8 pt-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const stepNum = i + 1;
            const completed = stepNum < step;
            const current = stepNum === step;
            return (
              <motion.div
                key={i}
                animate={{
                  scale: current ? [1, 1.3, 1] : completed ? 1 : 1,
                  backgroundColor: completed
                    ? 'rgb(20 184 166)'
                    : current
                      ? 'rgb(255 255 255)'
                      : 'rgb(229 231 235)',
                }}
                transition={
                  current
                    ? {
                        scale: {
                          repeat: Infinity,
                          duration: 2,
                          ease: 'easeInOut',
                        },
                      }
                    : completed
                      ? { type: 'spring', stiffness: 500, damping: 15 }
                      : { duration: 0.3 }
                }
                className={`rounded-full ${
                  completed
                    ? 'w-2.5 h-2.5'
                    : current
                      ? 'w-2.5 h-2.5 ring-2 ring-teal-500'
                      : 'w-2 h-2'
                }`}
              />
            );
          })}
        </div>

        <AnimatePresence>
          {step < 5 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-gray-400 hover:text-gray-500 transition-colors"
            >
              {saving ? 'Saving...' : "I'll do this later"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function calculateChildAge(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return `${years}`;
}

// ── Animated SVG Illustrations ─────────────────────────────────────

function WavingHand() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
      {/* Soft circle background */}
      <motion.circle
        cx="80"
        cy="80"
        r="70"
        fill="rgb(204 251 241)"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [0.95, 1.05, 0.95], opacity: 0.6 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      />
      {/* Hand */}
      <motion.g
        style={{ originX: '80px', originY: '90px' }}
        animate={{ rotate: [0, 15, -10, 15, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      >
        {/* Palm */}
        <path
          d="M72 105 C65 95 60 80 62 72 C63 67 68 65 71 70 L74 76 C72 65 71 55 74 50 C76 45 81 44 82 50 L84 62 C83 52 83 43 87 39 C90 35 94 36 94 42 L93 58 C93 48 95 42 99 40 C102 38 105 40 104 47 L101 68 C108 62 113 60 116 62 C119 64 118 68 114 73 L100 95 C95 103 87 110 78 110 C74 110 72 108 72 105Z"
          fill="rgb(251 191 36)"
          stroke="rgb(245 158 11)"
          strokeWidth="1.5"
        />
      </motion.g>
      {/* Sparkle dots */}
      {[
        [40, 45],
        [120, 40],
        [130, 100],
        [35, 110],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="3"
          fill="rgb(45 212 191)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  );
}

function CompassIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
      <motion.circle
        cx="70"
        cy="70"
        r="60"
        fill="rgb(204 251 241)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.5 }}
      />
      {/* Compass body */}
      <circle
        cx="70"
        cy="70"
        r="40"
        fill="white"
        stroke="rgb(20 184 166)"
        strokeWidth="3"
      />
      <circle
        cx="70"
        cy="70"
        r="35"
        fill="none"
        stroke="rgb(204 251 241)"
        strokeWidth="1"
      />
      {/* NSEW markers */}
      <text x="70" y="40" textAnchor="middle" fill="rgb(20 184 166)" fontSize="10" fontWeight="bold">
        N
      </text>
      <text x="70" y="108" textAnchor="middle" fill="rgb(156 163 175)" fontSize="9">
        S
      </text>
      <text x="38" y="74" textAnchor="middle" fill="rgb(156 163 175)" fontSize="9">
        W
      </text>
      <text x="102" y="74" textAnchor="middle" fill="rgb(156 163 175)" fontSize="9">
        E
      </text>
      {/* Needle */}
      <motion.g
        style={{ originX: '70px', originY: '70px' }}
        animate={{ rotate: [0, 20, -15, 10, -5, 0] }}
        transition={{
          repeat: Infinity,
          duration: 4,
          ease: 'easeInOut',
        }}
      >
        {/* North (teal) */}
        <polygon points="70,42 65,70 75,70" fill="rgb(20 184 166)" />
        {/* South (gray) */}
        <polygon points="70,98 65,70 75,70" fill="rgb(209 213 219)" />
      </motion.g>
      {/* Center dot */}
      <circle cx="70" cy="70" r="4" fill="rgb(20 184 166)" />
      <circle cx="70" cy="70" r="2" fill="white" />
    </svg>
  );
}

function HeartsIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
      <motion.circle
        cx="70"
        cy="70"
        r="60"
        fill="rgb(219 234 254)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.5 }}
      />
      {/* Large heart */}
      <motion.path
        d="M70 100 C50 82 30 68 30 54 C30 42 40 34 50 34 C58 34 65 39 70 46 C75 39 82 34 90 34 C100 34 110 42 110 54 C110 68 90 82 70 100Z"
        fill="rgb(251 113 133)"
        animate={{ scale: [1, 1.08, 1] }}
        style={{ originX: '70px', originY: '65px' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
      />
      {/* Small heart */}
      <motion.path
        d="M95 48 C89 42 85 38 85 33 C85 28 88 25 92 25 C95 25 97 27 98 29 C99 27 101 25 104 25 C108 25 111 28 111 33 C111 38 107 42 101 48Z"
        fill="rgb(253 164 175)"
        animate={{ scale: [1, 1.15, 1] }}
        style={{ originX: '98px', originY: '36px' }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          delay: 0.3,
          ease: 'easeInOut',
        }}
      />
      {/* Tiny sparkle */}
      {[
        [32, 42],
        [112, 58],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="2.5"
          fill="rgb(251 146 60)"
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            delay: i * 0.7,
          }}
        />
      ))}
    </svg>
  );
}

function LightbulbIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
      {/* Glow ring */}
      <motion.circle
        cx="70"
        cy="60"
        r="48"
        fill="rgb(254 249 195)"
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.05, 0.95] }}
        style={{ originX: '70px', originY: '60px' }}
        transition={{
          repeat: Infinity,
          duration: 2.5,
          ease: 'easeInOut',
        }}
      />
      {/* Bulb */}
      <motion.path
        d="M70 20 C50 20 35 35 35 55 C35 70 45 78 50 88 L90 88 C95 78 105 70 105 55 C105 35 90 20 70 20Z"
        fill="rgb(253 224 71)"
        stroke="rgb(250 204 21)"
        strokeWidth="2"
        animate={{ filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'] }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: 'easeInOut',
        }}
      />
      {/* Filament */}
      <path
        d="M60 60 Q65 50 70 60 Q75 70 80 60"
        stroke="rgb(245 158 11)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Base */}
      <rect x="55" y="90" width="30" height="6" rx="2" fill="rgb(156 163 175)" />
      <rect x="57" y="98" width="26" height="5" rx="2" fill="rgb(156 163 175)" />
      <rect x="60" y="105" width="20" height="4" rx="2" fill="rgb(156 163 175)" />
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 70 + Math.cos(rad) * 52;
        const y1 = 55 + Math.sin(rad) * 52;
        const x2 = 70 + Math.cos(rad) * 60;
        const y2 = 55 + Math.sin(rad) * 60;
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgb(250 204 21)"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </svg>
  );
}

function SparklesIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      {/* Central star */}
      <motion.path
        d="M60 15 L65 45 L95 50 L65 55 L60 85 L55 55 L25 50 L55 45 Z"
        fill="rgb(20 184 166)"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
        style={{ originX: '60px', originY: '50px' }}
      />
      {/* Orbiting sparkles */}
      {[
        { cx: 25, cy: 25, r: 5, delay: 0.4 },
        { cx: 100, cy: 20, r: 4, delay: 0.6 },
        { cx: 95, cy: 90, r: 6, delay: 0.8 },
        { cx: 20, cy: 85, r: 3, delay: 1.0 },
        { cx: 50, cy: 105, r: 4, delay: 0.5 },
        { cx: 90, cy: 55, r: 3, delay: 0.7 },
      ].map((s, i) => (
        <motion.circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={
            i % 2 === 0 ? 'rgb(45 212 191)' : 'rgb(251 191 36)'
          }
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.3, 1],
            opacity: [0, 1, 0.8],
          }}
          transition={{ delay: s.delay, duration: 0.5, ease: 'easeOut' }}
        />
      ))}
      {/* Small 4-point stars */}
      {[
        { x: 15, y: 55, delay: 0.9 },
        { x: 105, y: 40, delay: 1.1 },
      ].map((s, i) => (
        <motion.path
          key={`star-${i}`}
          d={`M${s.x} ${s.y - 6} L${s.x + 2} ${s.y} L${s.x} ${s.y + 6} L${s.x - 2} ${s.y} Z`}
          fill="rgb(250 204 21)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1], opacity: 1 }}
          transition={{ delay: s.delay, duration: 0.4 }}
          style={{ originX: `${s.x}px`, originY: `${s.y}px` }}
        />
      ))}
    </svg>
  );
}

// ── Module Icon Helper ─────────────────────────────────────────────

function ModuleIcon({ name }: { name: string }) {
  const cls = 'w-5 h-5 text-teal-600';
  switch (name) {
    case 'clipboard':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'users':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'book':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    default:
      return null;
  }
}
