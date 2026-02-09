// apps/api/src/crisis/crisis-detection.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { CrisisType } from './crisis.types';

// Export the interface so controller can use it
export interface DetectionResult {
  detected: boolean;
  type?: CrisisType;
  keywords: string[];
  confidence: number;
  suggestedAction?: string;
  showResources: boolean;
}

@Injectable()
export class CrisisDetectionService {
  private readonly logger = new Logger(CrisisDetectionService.name);

  // Comprehensive crisis keywords database
  private readonly crisisKeywords = {
    suicide: {
      type: CrisisType.SUICIDE_RISK,
      high: [
        'kill myself', 'end my life', 'suicide', 'want to die',
        'better off dead', 'no reason to live', 'ending it all',
        'take my life', 'not worth living', 'goodbye forever'
      ],
      medium: [
        'cant go on', 'no point', 'wish i was dead', 'tired of living',
        'dont want to be here', 'life is meaningless', 'want to disappear'
      ],
      contextual: [
        'hopeless', 'trapped', 'burden', 'alone', 'nobody cares'
      ]
    },
    selfHarm: {
      type: CrisisType.SELF_HARM,
      high: [
        'cut myself', 'hurt myself', 'self harm', 'self-harm',
        'burning myself', 'hitting myself', 'punish myself',
        'deserve pain', 'need to bleed'
      ],
      medium: [
        'scratch myself', 'bite myself', 'pull my hair',
        'starving myself', 'making myself sick'
      ],
      contextual: [
        'numb', 'feel something', 'release', 'control'
      ]
    },
    panic: {
      type: CrisisType.PANIC_ATTACK,
      high: [
        'cant breathe', 'panic attack', 'heart racing',
        'going to die', 'losing control', 'chest pain',
        'cant calm down', 'hyperventilating', 'going crazy'
      ],
      medium: [
        'freaking out', 'anxiety attack', 'shaking',
        'dizzy', 'sweating', 'trembling'
      ],
      contextual: [
        'overwhelmed', 'scared', 'terrified', 'paralyzed'
      ]
    },
    meltdown: {
      type: CrisisType.MELTDOWN,
      high: [
        'meltdown', 'shutting down', 'sensory overload',
        'cant cope', 'too much', 'breaking down',
        'losing it', 'falling apart', 'cant handle'
      ],
      medium: [
        'overwhelmed', 'overstimulated', 'need quiet',
        'too loud', 'too bright', 'cant think'
      ],
      contextual: [
        'autism', 'adhd', 'sensory', 'stimming'
      ]
    },
    medical: {
      type: CrisisType.MEDICAL_EMERGENCY,
      high: [
        'call ambulance', 'emergency', 'urgent help',
        'bleeding heavily', 'unconscious', 'not breathing',
        'severe pain', 'allergic reaction', 'overdose'
      ],
      medium: [
        'chest pain', 'difficulty breathing', 'severe headache',
        'vision loss', 'numbness', 'confusion'
      ],
      contextual: [
        'hospital', 'doctor', 'medical', '102', '108'
      ]
    },
    family: {
      type: CrisisType.FAMILY_CONFLICT,
      high: [
        'domestic violence', 'being abused', 'hit me',
        'threatened me', 'kicked out', 'running away',
        'unsafe at home', 'parent hitting'
      ],
      medium: [
        'family fight', 'parents fighting', 'divorce',
        'custody', 'family crisis', 'home conflict'
      ],
      contextual: [
        'argue', 'yelling', 'scared', 'hiding'
      ]
    },
    burnout: {
      type: CrisisType.BURNOUT,
      high: [
        'complete burnout', 'cant continue', 'giving up',
        'exhausted', 'nothing left', 'breaking point'
      ],
      medium: [
        'burned out', 'overwhelmed', 'too tired',
        'cant focus', 'no energy', 'drained'
      ],
      contextual: [
        'work', 'caregiver', 'stress', 'pressure'
      ]
    }
  };

  /**
   * Detect crisis keywords in content
   */
  async detectCrisisInContent(content: string): Promise<DetectionResult> {
    if (!content || content.trim().length === 0) {
      return {
        detected: false,
        keywords: [],
        confidence: 0,
        showResources: false
      };
    }

    const lowercaseContent = content.toLowerCase();
    const results: {
      type: CrisisType;
      keywords: string[];
      score: number;
      priority: 'high' | 'medium' | 'low';
    }[] = [];

    // Check each crisis category
    for (const [category, data] of Object.entries(this.crisisKeywords)) {
      const foundKeywords: string[] = [];
      let score = 0;
      let priority: 'high' | 'medium' | 'low' = 'low';

      // Check high priority keywords
      for (const keyword of data.high) {
        if (this.containsPhrase(lowercaseContent, keyword)) {
          foundKeywords.push(keyword);
          score += 3;
          priority = 'high';
        }
      }

      // Check medium priority keywords
      for (const keyword of data.medium) {
        if (this.containsPhrase(lowercaseContent, keyword)) {
          foundKeywords.push(keyword);
          score += 2;
          if (priority !== 'high') priority = 'medium';
        }
      }

      // Check contextual keywords
      for (const keyword of data.contextual) {
        if (lowercaseContent.includes(keyword)) {
          foundKeywords.push(keyword);
          score += 1;
        }
      }

      if (foundKeywords.length > 0) {
        results.push({
          type: data.type,
          keywords: foundKeywords,
          score,
          priority
        });
      }
    }

    // Sort by score and get the highest
    results.sort((a, b) => b.score - a.score);
    const topResult = results[0];

    if (!topResult) {
      return {
        detected: false,
        keywords: [],
        confidence: 0,
        showResources: false
      };
    }

    // Calculate confidence based on score
    const confidence = Math.min(topResult.score / 10, 1);

    // Determine suggested action based on type and priority
    const suggestedAction = this.getSuggestedAction(topResult.type, topResult.priority);

    // Log detection for monitoring
    this.logger.warn(`Crisis detected: ${topResult.type} with confidence ${confidence}`, {
      type: topResult.type,
      keywords: topResult.keywords,
      confidence,
      priority: topResult.priority
    });

    return {
      detected: true,
      type: topResult.type,
      keywords: topResult.keywords,
      confidence,
      suggestedAction,
      showResources: topResult.priority === 'high' || confidence > 0.5
    };
  }

  /**
   * Check if content contains crisis-related URLs or phone numbers
   */
  detectCrisisReferences(content: string): {
    hasEmergencyNumbers: boolean;
    hasHelplineReferences: boolean;
  } {
    const emergencyNumbers = ['102', '108', '1098', '1091', '100'];
    const helplineKeywords = ['helpline', 'hotline', 'crisis line', 'support line'];

    const hasEmergencyNumbers = emergencyNumbers.some(num => 
      content.includes(num)
    );

    const hasHelplineReferences = helplineKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    );

    return {
      hasEmergencyNumbers,
      hasHelplineReferences
    };
  }

  /**
   * Analyze conversation history for crisis patterns
   */
  async analyzeConversationPattern(
    messages: { content: string; timestamp: Date }[]
  ): Promise<{
    escalating: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  }> {
    if (messages.length < 2) {
      return {
        escalating: false,
        riskLevel: 'low',
        recommendation: 'Continue monitoring'
      };
    }

    // Check for escalation in recent messages
    const recentMessages = messages.slice(-5); // Last 5 messages
    const detections = await Promise.all(
      recentMessages.map(msg => this.detectCrisisInContent(msg.content))
    );

    const confidenceScores = detections.map(d => d.confidence);
    const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    
    // Check if confidence is increasing
    const escalating = confidenceScores.length > 2 && 
      confidenceScores[confidenceScores.length - 1] > confidenceScores[0];

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let recommendation = 'Continue monitoring';

    if (avgConfidence > 0.7 || detections.some(d => d.type === CrisisType.SUICIDE_RISK)) {
      riskLevel = 'high';
      recommendation = 'Immediate intervention required';
    } else if (avgConfidence > 0.4 || escalating) {
      riskLevel = 'medium';
      recommendation = 'Proactive support recommended';
    }

    return {
      escalating,
      riskLevel,
      recommendation
    };
  }

  /**
   * Helper: Check if a phrase exists in content (handles word boundaries)
   */
  private containsPhrase(content: string, phrase: string): boolean {
    // Create regex for word boundary matching
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(content);
  }

  /**
   * Get suggested action based on crisis type and priority
   */
  private getSuggestedAction(type: CrisisType, priority: 'high' | 'medium' | 'low'): string {
    const actions = {
      [CrisisType.SUICIDE_RISK]: {
        high: 'Immediate professional help required. Connect to crisis helpline.',
        medium: 'Reach out for support. Crisis resources available.',
        low: 'Consider talking to someone. Support is available.'
      },
      [CrisisType.SELF_HARM]: {
        high: 'Seek immediate support. Crisis counselor available.',
        medium: 'Coping strategies and support available.',
        low: 'Healthy coping resources available.'
      },
      [CrisisType.PANIC_ATTACK]: {
        high: 'Immediate calming support available.',
        medium: 'Breathing exercises and support available.',
        low: 'Anxiety management resources available.'
      },
      [CrisisType.MELTDOWN]: {
        high: 'Sensory support strategies available.',
        medium: 'Calming techniques and quiet space needed.',
        low: 'Self-regulation resources available.'
      },
      [CrisisType.MEDICAL_EMERGENCY]: {
        high: 'Call emergency services immediately (102/108).',
        medium: 'Seek medical attention promptly.',
        low: 'Consider medical consultation.'
      },
      [CrisisType.FAMILY_CONFLICT]: {
        high: 'Safety resources and shelter information available.',
        medium: 'Family crisis support available.',
        low: 'Conflict resolution resources available.'
      },
      [CrisisType.BURNOUT]: {
        high: 'Immediate stress relief support available.',
        medium: 'Burnout recovery resources available.',
        low: 'Self-care strategies available.'
      }
    };

    return actions[type]?.[priority] || 'Support resources available.';
  }

  /**
   * Get crisis type from string
   */
  getCrisisTypeFromString(typeStr: string): CrisisType | undefined {
    const typeMap: Record<string, CrisisType> = {
      'suicide': CrisisType.SUICIDE_RISK,
      'self_harm': CrisisType.SELF_HARM,
      'panic': CrisisType.PANIC_ATTACK,
      'meltdown': CrisisType.MELTDOWN,
      'medical': CrisisType.MEDICAL_EMERGENCY,
      'family': CrisisType.FAMILY_CONFLICT,
      'burnout': CrisisType.BURNOUT
    };

    return typeMap[typeStr.toLowerCase()];
  }
}