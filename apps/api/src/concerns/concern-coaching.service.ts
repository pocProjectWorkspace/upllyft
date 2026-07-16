import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/**
 * The coach.
 *
 * Given what a nursery has noticed about a child, this produces two things:
 *
 *   staffCoaching — PRIVATE to the inclusion lead: how to actually have the conversation.
 *                   Open with what you SAW, not a label. Partnership, not verdict. Never
 *                   name a condition. What to do if the parent is upset or defensive.
 *
 *   parentSummary — a warm, specific, non-alarming DRAFT the lead edits before sharing. It
 *                   describes concrete observations, frames the nursery as being on the
 *                   child's side, and invites a conversation — it never diagnoses.
 *
 * Uses Anthropic Claude when a key is configured, and falls back to a domain-aware template
 * otherwise, so the feature works (in a degraded but still humane form) without AI and is
 * deterministically testable. The fallback is what the e2e suite exercises.
 */

export interface CoachingInput {
  childFirstName: string;
  facilityName: string;
  domains: string[]; // developmental domains of concern (canonical ids)
  concernNotes: string[]; // the keyworker's CONCERN observation notes
  screeningFlags: string[]; // domains a screening flagged, if any
  concordanceNote?: string; // e.g. "home and nursery both flagged speech"
}

export interface CoachingOutput {
  staffCoaching: string;
  parentSummary: string;
  model: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  grossMotor: 'moving and coordination',
  fineMotor: 'using their hands',
  speechLanguage: 'talking and understanding',
  socialEmotional: 'playing and getting on with others',
  cognitiveLearning: 'thinking and learning',
  adaptiveSelfCare: 'everyday self-care',
  sensoryProcessing: 'coping with sounds, textures and busy spaces',
  visionHearing: 'seeing and hearing',
};
const humanDomain = (id: string) => DOMAIN_LABELS[id] ?? id;

@Injectable()
export class ConcernCoachingService {
  private readonly logger = new Logger(ConcernCoachingService.name);
  private client: Anthropic | null = null;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) this.client = new Anthropic({ apiKey });
    this.model =
      this.config.get<string>('ANTHROPIC_CONCERN_MODEL') ||
      this.config.get<string>('ANTHROPIC_INSIGHTS_MODEL') ||
      'claude-sonnet-5';
  }

  async coach(input: CoachingInput): Promise<CoachingOutput> {
    if (!this.client) return { ...this.fallback(input), model: 'fallback' };

    try {
      const out = await this.withClaude(input);
      return { ...out, model: this.model };
    } catch (e: any) {
      this.logger.error(`Coaching generation failed (${e?.message}); using fallback.`);
      return { ...this.fallback(input), model: 'fallback' };
    }
  }

  private async withClaude(input: CoachingInput): Promise<Omit<CoachingOutput, 'model'>> {
    const system =
      'You coach early-years staff (a nursery inclusion lead / SENCO) on how to raise a ' +
      'developmental concern with a parent, and you draft the message the parent receives. ' +
      'This is one of the hardest conversations in early years and it is easy to do harm.\n\n' +
      'HARD RULES:\n' +
      '- NEVER name or suggest a condition or diagnosis (not autism, ADHD, dyslexia, delay, ' +
      'disorder — nothing). A nursery observes; it does not diagnose. Describe what was SEEN.\n' +
      '- The parent is the expert on their child and an equal partner, never a problem to manage.\n' +
      '- Lead with specifics the parent can picture, framed warmly. No jargon, no scores.\n' +
      '- The aim is a conversation and, if the parent wants, a route to support — not a verdict.\n' +
      '- Reading age ~11 for the parent message. British English.\n\n' +
      'Return ONLY JSON: {"staffCoaching": "...", "parentSummary": "..."}. ' +
      'staffCoaching is private guidance for the STAFF (how to open, what to emphasise, what ' +
      'to avoid, how to handle upset or defensiveness, next steps). parentSummary is the draft ' +
      'message TO the parent (warm, specific, non-diagnostic, inviting a conversation).';

    const user =
      `Nursery: ${input.facilityName}\n` +
      `Child's first name: ${input.childFirstName}\n` +
      `Areas of concern: ${input.domains.map(humanDomain).join(', ') || '(general)'}\n` +
      (input.concernNotes.length
        ? `What the keyworker has noted:\n${input.concernNotes.map((n) => `- ${n}`).join('\n')}\n`
        : '') +
      (input.screeningFlags.length
        ? `A developmental screening flagged: ${input.screeningFlags.map(humanDomain).join(', ')}\n`
        : '') +
      (input.concordanceNote ? `Home vs nursery: ${input.concordanceNote}\n` : '');

    const response = await this.client!.messages.create({
      // 4000 tokens: the two fields together (private coaching + a full parent letter) ran
      // past 2000 and truncated mid-JSON, which parsed as "Unexpected end of JSON input"
      // and silently dropped every call to the fallback. Give it room to close the object.
      model: this.model,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('No text from Claude');
    if (response.stop_reason === 'max_tokens') throw new Error('Coaching response was truncated');

    let t = block.text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    const open = t.indexOf('{');
    const close = t.lastIndexOf('}');
    if (open === -1 || close <= open) throw new Error('No JSON object in coaching response');
    t = t.slice(open, close + 1);
    const parsed = JSON.parse(t);

    if (!parsed.staffCoaching || !parsed.parentSummary) {
      throw new Error('Coaching response missing fields');
    }
    return { staffCoaching: String(parsed.staffCoaching), parentSummary: String(parsed.parentSummary) };
  }

  /**
   * No-AI fallback. Still domain-aware and humane — a nursery without an Anthropic key
   * should get a usable starting point, not a blank box. Staff edit before sharing anyway.
   */
  private fallback(input: CoachingInput): Omit<CoachingOutput, 'model'> {
    const areas = input.domains.map(humanDomain);
    const areaPhrase = areas.length
      ? areas.length === 1
        ? areas[0]
        : `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`
      : 'their development';
    const child = input.childFirstName;

    const staffCoaching = [
      `HOW TO RAISE THIS WITH ${child.toUpperCase()}'S PARENT`,
      '',
      `Open with warmth and something you value about ${child}, then share what you have`,
      `noticed around ${areaPhrase} — describe specific moments, not conclusions.`,
      '',
      'Do:',
      `• Lead with concrete examples the parent can picture.`,
      `• Ask what they see at home — they know ${child} best, and it may look different there.`,
      `• Frame it as noticing early so ${child} gets any support that helps, together.`,
      '',
      "Don't:",
      `• Name or hint at any condition or diagnosis — that is not the nursery's place.`,
      `• Use scores, jargon, or the word "delay". Stay with what was observed.`,
      `• Rush to a plan in the first conversation. Listening is the first step.`,
      '',
      'If the parent is upset or defensive, that is normal — slow down, acknowledge it is a',
      "lot to hear, and reassure them nothing is being decided; you are raising it together.",
      '',
      input.screeningFlags.length
        ? `A screening also flagged ${input.screeningFlags.map(humanDomain).join(', ')} — mention it as one more signal, gently, not as proof.`
        : '',
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    const notesLine = input.concernNotes.length
      ? ` For example, ${input.concernNotes[0].replace(/\.$/, '').toLowerCase()}.`
      : '';

    const parentSummary = [
      `Hello,`,
      '',
      `We wanted to share something we have been noticing about ${child} at ${input.facilityName}.`,
      `Over the past little while, ${child}'s keyworker has observed a few things around`,
      `${areaPhrase}.${notesLine}`,
      '',
      `We are not saying anything is wrong — children develop at their own pace, and what we see`,
      `in a busy room can look quite different from home. We are sharing it early because if there`,
      `is anything that would help ${child}, it is easier to support sooner, and together.`,
      '',
      `Could we find a time for a short, relaxed chat? We would love to hear how ${child} is at`,
      `home, and think together about anything that might help. There is no pressure — just us on`,
      `${child}'s side.`,
    ].join('\n');

    return { staffCoaching, parentSummary };
  }
}
