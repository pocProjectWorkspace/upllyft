/**
 * Author the EDUCATOR-ONLY items — the things only a keyworker can see.
 *
 * WHY THESE EXIST. Until now the educator answered the same questions as the parent, just
 * from a different vantage point. That gives a real cross-setting comparison, but it
 * wastes the nursery's actual advantage: a parent has never once watched their child in a
 * group of twenty. Nobody at home can tell you whether a child follows an instruction
 * given to everyone rather than to them by name, whether they can wait their turn among
 * peers, whether they cope with the noise of a full room, or how they separate at
 * drop-off. Those behaviours do not exist at home — there is no group.
 *
 * That is where difficulty most often first shows itself, and historically it is where
 * children are caught LATE, because the person who noticed had no route to say so.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  CLINICAL REVIEW REQUIRED BEFORE THESE ARE USED ON A REAL CHILD.
 *
 * Every item below is written by an engineer against public developmental guidance. That
 * is enough to draft, and NOT enough to screen with. Screening output drives referral
 * conversations with real families, so each item is written with `clinicalReview:
 * "PENDING"`, and `assessments.service.ts` EXCLUDES pending items from the form and from
 * scoring. They are in the repo to be reviewed, not to be used.
 *
 * To enable them after a clinician signs off: set clinicalReview to "APPROVED" on the
 * items they approve. Nothing else needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROVENANCE. Each item cites the public framework it is drawn from:
 *   CDC   — CDC "Learn the Signs. Act Early." social-emotional milestones
 *   EYFS  — the UK statutory Early Years Foundation Stage framework, specifically the
 *           Personal, Social and Emotional Development and Communication and Language
 *           areas of learning
 *   ASHA  — American Speech-Language-Hearing Association communication milestones
 *
 * NO ITEM IS MARKED redFlag. A red flag triggers a tier-2 probe and escalation, and
 * deciding what constitutes one is a clinical judgment, not an engineering one. Left to
 * the reviewer.
 *
 * Idempotent. Run:
 *   node_modules/.bin/ts-node --transpile-only prisma/seeds/add-educator-items.ts [--write]
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '../../src/assessments/questionnaires');
const WRITE = process.argv.includes('--write');

interface Item {
  id: string;
  question: string;
  weight: number;
  redFlag: false;
  construct: string;
  sources: string[];
  whyWeAsk: string;
  observableBy: ['EDUCATOR'];
  clinicalReview: 'PENDING';
}

const mk = (
  id: string,
  domain: string,
  question: string,
  construct: string,
  sources: string[],
  whyWeAsk: string,
): Item => ({
  id,
  question,
  weight: 1.0,
  redFlag: false,
  construct,
  sources,
  whyWeAsk,
  observableBy: ['EDUCATOR'],
  clinicalReview: 'PENDING',
});

/**
 * Items are educator-voiced ("this child"), not parent-voiced ("your child"), because a
 * keyworker is not the parent and the form should not pretend otherwise.
 */
const ITEMS: Record<string, Record<string, Item[]>> = {
  '16-24-months': {
    socialEmotional: [
      mk('T1_SE_E01', 'socialEmotional', 'Does this child settle within a few minutes after their parent leaves at drop-off?', 'Separation & regulation', ['EYFS', 'CDC'], 'Separation is only observable at the point of separation. A child who cannot recover from drop-off after weeks of settling in is telling you something a parent cannot see.'),
      mk('T1_SE_E02', 'socialEmotional', 'Does this child look towards a familiar adult for comfort when upset in the room?', 'Secure base behaviour', ['EYFS', 'CDC'], 'Using a key adult as a secure base in a group setting is a distinct skill from doing so with a parent at home.'),
      mk('T1_SE_E03', 'socialEmotional', 'Does this child watch or copy what other children are doing?', 'Peer orientation', ['CDC', 'EYFS'], 'Noticing peers is the precursor to playing with them. Parents rarely see their child among a group of unfamiliar children.'),
    ],
    speechLanguage: [
      mk('T1_SL_E01', 'speechLanguage', 'Does this child respond when an instruction is given to the whole group (e.g. "everyone come to the carpet")?', 'Group-directed comprehension', ['EYFS', 'ASHA'], 'Responding to an instruction not addressed to them by name is much harder than a one-to-one instruction, and it does not arise at home.'),
      mk('T1_SL_E02', 'speechLanguage', 'Does this child make their needs known to an adult who is not their parent?', 'Communication with unfamiliar adults', ['ASHA', 'EYFS'], 'A child who communicates freely at home but not with any adult at nursery may be showing selective difficulty a parent will never observe.'),
    ],
    sensoryProcessing: [
      mk('T1_SP_E01', 'sensoryProcessing', 'Does this child cope with the noise and movement of a busy room without becoming distressed or withdrawn?', 'Sensory load in a group', ['EYFS'], 'A home is quiet. A room of twenty toddlers is not. Sensory difficulty often only becomes visible under that load.'),
    ],
  },

  '24-36-months': {
    socialEmotional: [
      mk('T1_SE_E01', 'socialEmotional', 'Does this child play alongside other children without frequent conflict?', 'Parallel play', ['CDC', 'EYFS'], 'Parallel play is the developmental step before cooperative play, and it can only be watched in a group.'),
      mk('T1_SE_E02', 'socialEmotional', 'Can this child wait briefly for a turn (e.g. for a bike, or at the sink)?', 'Turn-taking & impulse control', ['EYFS', 'CDC'], 'Waiting among peers who also want the thing is a different skill from waiting at home, where there is usually no competition.'),
      mk('T1_SE_E03', 'socialEmotional', 'Does this child settle within a few minutes after their parent leaves at drop-off?', 'Separation & regulation', ['EYFS', 'CDC'], 'Only observable at the point of separation.'),
      mk('T2_SE_E04', 'socialEmotional', 'When another child takes something from them, does this child react in a way that is typical for their age (rather than with unusual distress, aggression, or no reaction at all)?', 'Peer conflict response', ['EYFS'], 'How a child responds to peer conflict is one of the richest early social signals, and it simply cannot happen at home without siblings.'),
    ],
    speechLanguage: [
      mk('T1_SL_E01', 'speechLanguage', 'Does this child follow an instruction given to the whole group, without needing it repeated to them individually?', 'Group-directed comprehension', ['EYFS', 'ASHA'], 'A very common point at which a language or attention difficulty first shows itself — and invisible at home.'),
      mk('T1_SL_E02', 'speechLanguage', 'Do other children generally understand what this child is saying?', 'Intelligibility to peers', ['ASHA'], 'A parent usually understands their own child long after strangers cannot. Peers are the honest test of intelligibility.'),
      mk('T2_SL_E03', 'speechLanguage', 'Does this child use words (not only gestures or leading by the hand) to ask a peer for something?', 'Peer-directed communication', ['ASHA', 'EYFS'], 'Communicating with a peer is harder than with an attuned adult, who fills in the gaps.'),
    ],
    cognitiveLearning: [
      mk('T1_CL_E01', 'cognitiveLearning', 'Can this child stay with a group activity (e.g. story or song time) for a few minutes?', 'Sustained attention in a group', ['EYFS'], 'Attention in a group, with distractions and without one-to-one adult support, is the version that predicts classroom difficulty.'),
      mk('T2_CL_E02', 'cognitiveLearning', 'Does this child manage a change of activity (e.g. tidy-up time, going outside) without unusual distress?', 'Transitions', ['EYFS'], 'Difficulty with transitions is a well-recognised early indicator, and a nursery day is full of them while a home day is not.'),
    ],
    sensoryProcessing: [
      mk('T1_SP_E01', 'sensoryProcessing', 'Does this child cope with the noise and movement of a busy room without becoming distressed or withdrawn?', 'Sensory load in a group', ['EYFS'], 'Sensory difficulty is often only unmasked by the sensory load of a group setting.'),
    ],
    adaptiveSelfCare: [
      mk('T2_AD_E01', 'adaptiveSelfCare', 'Does this child manage nursery routines (e.g. coat on for outside, sitting for snack) with the same level of help as their peers?', 'Self-management in a routine', ['EYFS'], 'Compared against same-age peers doing the same routine at the same moment — a comparison only a nursery can make.'),
    ],
  },

  '3-4-years': {
    socialEmotional: [
      mk('T1_SE_E01', 'socialEmotional', 'Does this child join in cooperative play with other children (e.g. a shared pretend game)?', 'Cooperative play', ['CDC', 'EYFS'], 'Cooperative play requires negotiating with a peer in real time. It is the clearest social milestone a nursery can see and a parent cannot.'),
      mk('T1_SE_E02', 'socialEmotional', 'Can this child wait their turn in a group without becoming distressed?', 'Turn-taking & impulse control', ['EYFS', 'CDC'], 'Waiting among competing peers.'),
      mk('T2_SE_E03', 'socialEmotional', 'Does this child have at least one child they choose to play with?', 'Peer preference / friendship', ['EYFS'], 'The emergence of preferred playmates is a meaningful social milestone, and it exists only in a peer group.'),
      mk('T2_SE_E04', 'socialEmotional', 'When there is a disagreement with another child, can this child resolve it (with adult support) rather than only through distress or physical action?', 'Peer conflict resolution', ['EYFS'], 'Conflict resolution with peers is not something a home can rehearse.'),
    ],
    speechLanguage: [
      mk('T1_SL_E01', 'speechLanguage', 'Does this child follow a two-step instruction given to the whole group?', 'Group-directed comprehension', ['EYFS', 'ASHA'], 'The demand that most often exposes a language or attention difficulty before school.'),
      mk('T1_SL_E02', 'speechLanguage', 'Do other children generally understand this child’s speech?', 'Intelligibility to peers', ['ASHA'], 'Peers do not have a parent’s ear for their child.'),
      mk('T2_SL_E03', 'speechLanguage', 'Does this child join in conversation with peers, rather than only with adults?', 'Peer conversation', ['ASHA', 'EYFS'], 'Some children converse well with adults and not at all with children — a pattern a parent may never see.'),
    ],
    cognitiveLearning: [
      mk('T1_CL_E01', 'cognitiveLearning', 'Can this child stay with a group activity for around ten minutes?', 'Sustained attention in a group', ['EYFS'], 'Group attention, not one-to-one attention, is what school will demand.'),
      mk('T2_CL_E02', 'cognitiveLearning', 'Does this child manage transitions between activities without unusual distress?', 'Transitions', ['EYFS'], 'A nursery day has many transitions; a home day has few.'),
    ],
    sensoryProcessing: [
      mk('T1_SP_E01', 'sensoryProcessing', 'Does this child cope with a busy, noisy room (e.g. lunch hall, large group) without becoming distressed or withdrawn?', 'Sensory load in a group', ['EYFS'], 'The sensory demand of a group setting has no equivalent at home.'),
    ],
    adaptiveSelfCare: [
      mk('T2_AD_E01', 'adaptiveSelfCare', 'Does this child manage nursery routines with a similar level of help as their peers?', 'Self-management in a routine', ['EYFS'], 'A peer-referenced judgment, which only a nursery is in a position to make.'),
    ],
  },
};

let added = 0;
let skipped = 0;
const summary: string[] = [];

for (const [ageGroup, byDomain] of Object.entries(ITEMS)) {
  const file = path.join(DIR, `${ageGroup}.json`);
  const doc = JSON.parse(fs.readFileSync(file, 'utf-8'));

  for (const [domainId, items] of Object.entries(byDomain)) {
    const domain = doc.domains.find((d: any) => d.id === domainId);
    if (!domain) throw new Error(`${ageGroup}: no domain ${domainId}`);

    for (const item of items) {
      const tier = item.id.startsWith('T2') ? 'tier2' : 'tier1';
      domain[tier] ??= [];

      // Idempotent: an item already present is left exactly as it is, so a reviewer's
      // edits (including flipping clinicalReview to APPROVED) are never overwritten.
      if (domain[tier].some((q: any) => q.id === item.id)) {
        skipped++;
        continue;
      }

      domain[tier].push(item);
      added++;
      summary.push(`  ${ageGroup.padEnd(14)} ${domainId.padEnd(18)} ${tier}  ${item.question.slice(0, 62)}`);
    }
  }

  if (WRITE) fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
}

console.log(`\n${added} educator-only item(s) added, ${skipped} already present.\n`);
console.log(summary.join('\n'));
console.log(
  '\n⚠️  All are clinicalReview: PENDING and are EXCLUDED from the form and from scoring' +
    '\n    until a clinician approves them. See the header of this file.',
);
console.log(WRITE ? '\n✅ written' : '\n(dry run — pass --write to apply)');
