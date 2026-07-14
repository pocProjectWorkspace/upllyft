'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@upllyft/api-client';
import * as claimsApi from '@/lib/api/claims';
import type { ClaimPreview } from '@/lib/api/claims';
import {
  Loader2,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  School,
  Stethoscope,
} from 'lucide-react';

/**
 * The parent claim.
 *
 * A guardian arrives here from an email, usually with NO Upllyft account, about a
 * child a nursery entered on their behalf. Three things this page must not get wrong:
 *
 *  1. It must be usable BEFORE they have an account. They cannot decide whether to
 *     sign up until they can see who is asking and about whom, so the preview is
 *     unauthenticated (and minimised server-side to just that).
 *
 *  2. "This isn't my child" must not require an account. Making someone register in
 *     order to report that we hold a record about a child who isn't theirs is how you
 *     guarantee they never tell you.
 *
 *  3. Claiming is NOT consenting. Confirming "yes, that's my child" and agreeing "you
 *     may record observations about them" are two separate decisions, and they are
 *     asked separately. One button for both would make the consent meaningless.
 */

const CONSENT_COPY: Record<string, { type: string; title: string; body: string }> = {
  // These types are not decorative: the nursery gate checks DATA_PROCESSING and the
  // clinic gate checks ASSESSMENT. Granting the wrong one would record a consent that
  // opens nothing, and the parent would think they had said yes.
  NURSERY: {
    type: 'DATA_PROCESSING',
    title: 'Let them record observations',
    body: 'Their keyworker can note how your child is playing, talking and moving day to day. You can see everything they record, and you can withdraw this at any time.',
  },
  SCHOOL: {
    type: 'DATA_PROCESSING',
    title: 'Let them record observations',
    body: 'Their teacher can note how your child is learning and developing. You can see everything they record, and you can withdraw this at any time.',
  },
  CLINIC: {
    type: 'ASSESSMENT',
    title: 'Let them open your child’s record',
    body: 'Their clinician can see and add to your child’s assessments and progress. You can withdraw this at any time.',
  },
};

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: preview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['claim', token],
    queryFn: () => claimsApi.previewClaim(token),
    retry: false,
  });

  const [accepted, setAccepted] = useState<claimsApi.ClaimAccepted | null>(null);
  const [disputed, setDisputed] = useState(false);
  const [consented, setConsented] = useState(false);

  if (isLoading || authLoading) {
    return <Centered><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></Centered>;
  }

  if (error) {
    return (
      <Shell>
        <Terminal
          icon={<AlertCircle className="w-6 h-6 text-gray-400" />}
          title="This link isn’t valid"
          body="It may have been mistyped, or already used. Ask the nursery to send you a new one."
        />
      </Shell>
    );
  }

  if (!preview) return null;

  // ── Terminal states ───────────────────────────────────────────────────────
  if (disputed) {
    return (
      <Shell>
        <Terminal
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
          title="Thank you — we’ve told them"
          body={`We've let ${preview.facilityName} know this isn't your child, and removed the request. They never had access to any record.`}
        />
      </Shell>
    );
  }

  if (consented && accepted) {
    return (
      <Shell>
        <Terminal
          icon={<ShieldCheck className="w-6 h-6 text-green-600" />}
          title="All set"
          body={`${accepted.facilityName} can now record observations about ${preview.childFirstName}. You'll see everything they add, and you can withdraw this whenever you like.`}
          action={{ label: 'Go to your dashboard', href: '/' }}
        />
      </Shell>
    );
  }

  if (preview.status === 'ACCEPTED') {
    return (
      <Shell>
        <Terminal
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
          title="Already claimed"
          body={`${preview.childFirstName} has already been linked to an Upllyft account.`}
          action={{ label: 'Sign in', href: '/login' }}
        />
      </Shell>
    );
  }

  if (preview.status === 'DISPUTED') {
    return (
      <Shell>
        <Terminal
          icon={<AlertCircle className="w-6 h-6 text-gray-400" />}
          title="Already reported"
          body="You've already told us this isn't your child. Nothing has been shared."
        />
      </Shell>
    );
  }

  if (preview.status === 'REVOKED') {
    return (
      <Shell>
        <Terminal
          icon={<AlertCircle className="w-6 h-6 text-gray-400" />}
          title="This request was withdrawn"
          body={`${preview.facilityName} cancelled it.`}
        />
      </Shell>
    );
  }

  if (preview.status === 'EXPIRED' || preview.expired) {
    return (
      <Shell>
        <Terminal
          icon={<AlertCircle className="w-6 h-6 text-amber-500" />}
          title="This link has expired"
          body={`Ask ${preview.facilityName} to send you a new one.`}
        />
      </Shell>
    );
  }

  // ── Live states ───────────────────────────────────────────────────────────
  return (
    <Shell>
      {accepted ? (
        <ConsentStep
          preview={preview}
          accepted={accepted}
          onDone={() => setConsented(true)}
        />
      ) : isAuthenticated ? (
        <MatchStep preview={preview} token={token} onAccepted={setAccepted} onDisputed={() => setDisputed(true)} />
      ) : (
        <SignInStep preview={preview} token={token} onDisputed={() => setDisputed(true)} />
      )}
    </Shell>
  );
}

// ── Step 1 (no account): who is asking, and what are they asking for ────────

function SignInStep({
  preview,
  token,
  onDisputed,
}: {
  preview: ClaimPreview;
  token: string;
  onDisputed: () => void;
}) {
  const next = encodeURIComponent(`/claim/${token}`);

  return (
    <>
      <Asking preview={preview} />

      <div className="space-y-2 mt-6">
        <a
          href={`/register?next=${next}`}
          className="block w-full text-center px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          Create an account to continue
        </a>
        <a
          href={`/login?next=${next}`}
          className="block w-full text-center px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          I already have an Upllyft account
        </a>
      </div>

      <DisputeLink token={token} childName={preview.childFirstName} onDisputed={onDisputed} />
    </>
  );
}

// ── Step 2 (signed in): is this your child, and which one ───────────────────

function MatchStep({
  preview,
  token,
  onAccepted,
  onDisputed,
}: {
  preview: ClaimPreview;
  token: string;
  onAccepted: (a: claimsApi.ClaimAccepted) => void;
  onDisputed: () => void;
}) {
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['claim', token, 'candidates'],
    queryFn: () => claimsApi.claimCandidates(token),
    retry: false,
  });

  const [choice, setChoice] = useState<string | 'new' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const accept = useMutation({
    mutationFn: () => claimsApi.acceptClaim(token, choice === 'new' ? undefined : choice!),
    onSuccess: onAccepted,
    onError: (e: any) =>
      setErr(e?.response?.data?.message ?? 'Something went wrong. Please try again.'),
  });

  if (isLoading) {
    return <Centered><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></Centered>;
  }

  const mine = candidates?.yourChildren ?? [];

  return (
    <>
      <Asking preview={preview} />

      <div className="mt-6">
        <p className="text-sm font-medium text-gray-900 mb-3">
          Is this your child?
        </p>

        <div className="space-y-2">
          {/*
            If they already have this child on Upllyft, picking them MERGES — one child
            record, many settings. Creating a second copy is the thing the whole tenancy
            model exists to prevent, so this choice is offered before the default.
          */}
          {mine.map(c => (
            <button
              key={c.id}
              onClick={() => setChoice(c.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                choice === c.id
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-sm font-medium text-gray-900">{c.firstName}</span>
              <span className="text-xs text-gray-500 ml-2">
                born {new Date(c.dateOfBirth).toLocaleDateString()}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Already on your account — we’ll link {preview.facilityName} to them.
              </span>
            </button>
          ))}

          <button
            onClick={() => setChoice('new')}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              choice === 'new'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-sm font-medium text-gray-900">
              Yes — {preview.childFirstName} is new to Upllyft
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {mine.length > 0
                ? 'Add them to your account as a new child.'
                : 'We’ll add them to your account.'}
            </span>
          </button>
        </div>

        {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

        <button
          onClick={() => accept.mutate()}
          disabled={!choice || accept.isPending}
          className="w-full mt-4 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {accept.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirm
        </button>
      </div>

      <DisputeLink token={token} childName={preview.childFirstName} onDisputed={onDisputed} />
    </>
  );
}

// ── Step 3: consent. A SEPARATE decision, asked separately. ─────────────────

function ConsentStep({
  preview,
  accepted,
  onDone,
}: {
  preview: ClaimPreview;
  accepted: claimsApi.ClaimAccepted;
  onDone: () => void;
}) {
  const copy = CONSENT_COPY[preview.facilityType] ?? CONSENT_COPY.NURSERY;
  const [err, setErr] = useState<string | null>(null);

  const grant = useMutation({
    mutationFn: () =>
      claimsApi.grantConsent({
        childId: accepted.childId,
        facilityId: accepted.facilityId,
        type: copy.type,
        purpose: `Granted by guardian via claim link`,
      }),
    onSuccess: onDone,
    onError: (e: any) =>
      setErr(e?.response?.data?.message ?? 'Something went wrong. Please try again.'),
  });

  return (
    <>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          {preview.childFirstName} is linked to your account
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {accepted.merged
            ? 'We linked them to the child you already had — no duplicate record.'
            : 'They’ve been added to your account.'}
        </p>
      </div>

      <div className="mt-6 p-4 rounded-lg border border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">{copy.title}</h2>
        <p className="text-sm text-gray-600 mt-1.5">{copy.body}</p>

        {/*
          Saying plainly what the current state IS. Right now the facility has NOTHING —
          that is the truth, and it is the only thing that makes the choice below real
          rather than a formality they click past.
        */}
        <div className="flex gap-2 mt-3 p-2.5 rounded-md bg-gray-50 text-xs text-gray-600">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Right now {accepted.facilityName} can see {preview.childFirstName}’s name on
            their roster and nothing else.
          </span>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

      <div className="space-y-2 mt-4">
        <button
          onClick={() => grant.mutate()}
          disabled={grant.isPending}
          className="w-full px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {grant.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Yes, I agree
        </button>
        {/*
          Declining is a first-class option, not a dark pattern. The child stays linked
          to the parent either way; the facility just doesn't get access. A parent who
          feels cornered here is a parent who does not trust the platform.
        */}
        <a
          href="/"
          className="block w-full text-center px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          Not right now
        </a>
      </div>
      <p className="text-xs text-gray-500 text-center mt-3">
        {preview.childFirstName} stays on your account either way. You can decide this
        later from their profile.
      </p>
    </>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

function Asking({ preview }: { preview: ClaimPreview }) {
  const isClinic = preview.facilityType === 'CLINIC';
  const Icon = isClinic ? Stethoscope : School;

  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-teal-600" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900">
        {preview.facilityName} added {preview.childFirstName}
      </h1>
      <p className="text-sm text-gray-600 mt-2">
        {isClinic
          ? `They'd like you to have access to ${preview.childFirstName}'s records on Upllyft.`
          : `They'd like your permission to record observations about ${preview.childFirstName}'s development.`}
      </p>

      {!isClinic && (
        <div className="flex gap-2 mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-600 text-left">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            They can’t see anything about {preview.childFirstName} yet. Nothing is shared
            until you say so.
          </span>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Sent to {preview.guardianEmail}</p>
    </div>
  );
}

function DisputeLink({
  token,
  childName,
  onDisputed,
}: {
  token: string;
  childName: string;
  onDisputed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const dispute = useMutation({
    mutationFn: () => claimsApi.disputeClaim(token, reason.trim() || undefined),
    onSuccess: onDisputed,
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs text-gray-500 hover:text-gray-700 mt-5 underline"
      >
        {childName} isn’t my child
      </button>
    );
  }

  return (
    <div className="mt-5 p-4 rounded-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900">Report this</p>
      <p className="text-xs text-gray-600 mt-1">
        We’ll tell them, and remove the request. They never had access to any record.
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Anything you'd like us to pass on (optional)"
        rows={2}
        className="w-full mt-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => dispute.mutate()}
          disabled={dispute.isPending}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 inline-flex items-center justify-center gap-2"
        >
          {dispute.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Report
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {children}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}

function Terminal({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-600 mt-2">{body}</p>
      {action && (
        <a
          href={action.href}
          className="inline-block mt-5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
