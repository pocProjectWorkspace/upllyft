import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@upllyft/ui';
import {
  getCrisisResources,
  getEmergencyContacts,
  detectCrisis,
  getMyCrisisIncidents,
  type CrisisResourceFilters,
  type CrisisDetectionResult,
} from '@/lib/api/crisis';

const crisisKeys = {
  all: ['crisis'] as const,
  resources: (filters?: CrisisResourceFilters) => [...crisisKeys.all, 'resources', filters] as const,
  emergency: () => [...crisisKeys.all, 'emergency'] as const,
  incidents: () => [...crisisKeys.all, 'incidents'] as const,
};

export function useCrisisResources(filters?: CrisisResourceFilters) {
  return useQuery({
    queryKey: crisisKeys.resources(filters),
    queryFn: () => getCrisisResources(filters),
  });
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: crisisKeys.emergency(),
    queryFn: getEmergencyContacts,
  });
}

export function useDetectCrisis() {
  return useMutation({
    mutationFn: (content: string) => detectCrisis(content),
  });
}

export function useMyCrisisIncidents() {
  return useQuery({
    queryKey: crisisKeys.incidents(),
    queryFn: getMyCrisisIncidents,
  });
}

// --- Crisis keyword detection with confidence scoring ---

const CRISIS_KEYWORDS: Record<string, { weight: number; type: string }> = {
  // Suicide / self-harm — highest weight
  'suicide': { weight: 1.0, type: 'SUICIDE_RISK' },
  'kill myself': { weight: 1.0, type: 'SUICIDE_RISK' },
  'end my life': { weight: 1.0, type: 'SUICIDE_RISK' },
  'want to die': { weight: 0.95, type: 'SUICIDE_RISK' },
  'self-harm': { weight: 0.9, type: 'SUICIDE_RISK' },
  'self harm': { weight: 0.9, type: 'SUICIDE_RISK' },
  'hurt myself': { weight: 0.85, type: 'SUICIDE_RISK' },
  'no reason to live': { weight: 0.9, type: 'SUICIDE_RISK' },
  'better off dead': { weight: 0.95, type: 'SUICIDE_RISK' },
  'suicidal': { weight: 1.0, type: 'SUICIDE_RISK' },

  // Panic / anxiety
  'panic attack': { weight: 0.8, type: 'PANIC_ATTACK' },
  'can\'t breathe': { weight: 0.75, type: 'PANIC_ATTACK' },
  'heart racing': { weight: 0.6, type: 'PANIC_ATTACK' },
  'anxiety attack': { weight: 0.75, type: 'PANIC_ATTACK' },

  // Meltdown / sensory overload
  'meltdown': { weight: 0.7, type: 'MELTDOWN' },
  'sensory overload': { weight: 0.7, type: 'MELTDOWN' },
  'overwhelmed': { weight: 0.5, type: 'MELTDOWN' },
  'shutting down': { weight: 0.6, type: 'MELTDOWN' },
  'can\'t cope': { weight: 0.65, type: 'MELTDOWN' },

  // Family conflict
  'domestic violence': { weight: 0.9, type: 'FAMILY_CONFLICT' },
  'being abused': { weight: 0.9, type: 'FAMILY_CONFLICT' },
  'abuse': { weight: 0.6, type: 'FAMILY_CONFLICT' },

  // Medical emergency
  'medical emergency': { weight: 0.9, type: 'MEDICAL_EMERGENCY' },
  'seizure': { weight: 0.8, type: 'MEDICAL_EMERGENCY' },
  'unconscious': { weight: 0.85, type: 'MEDICAL_EMERGENCY' },

  // Burnout
  'burnout': { weight: 0.5, type: 'BURNOUT' },
  'exhausted': { weight: 0.4, type: 'BURNOUT' },
  'give up': { weight: 0.55, type: 'BURNOUT' },
  'hopeless': { weight: 0.6, type: 'BURNOUT' },
};

/**
 * Client-side crisis keyword detection with confidence scoring.
 * For real-time detection in text inputs without waiting for API calls.
 * When high confidence is detected, it can also call the server-side API.
 */
export function useCrisisDetection() {
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);
  const [detectionResult, setDetectionResult] = useState<CrisisDetectionResult | null>(null);
  const lastDetectedRef = useRef<string>('');
  const { toast } = useToast();

  const detectCrisisKeywords = useCallback(
    async (content: string) => {
      if (!content || content.trim().length < 10) return;

      const lower = content.toLowerCase();

      // Don't re-detect the same content
      if (lower === lastDetectedRef.current) return;

      const matchedKeywords: string[] = [];
      let maxWeight = 0;
      let detectedType: string | undefined;

      for (const [keyword, meta] of Object.entries(CRISIS_KEYWORDS)) {
        if (lower.includes(keyword)) {
          matchedKeywords.push(keyword);
          if (meta.weight > maxWeight) {
            maxWeight = meta.weight;
            detectedType = meta.type;
          }
        }
      }

      if (matchedKeywords.length === 0) return;

      // Compute confidence: base from max keyword weight, boosted by multiple matches
      const confidence = Math.min(
        1,
        maxWeight + (matchedKeywords.length - 1) * 0.05,
      );

      if (confidence <= 0.4) return;

      lastDetectedRef.current = lower;

      const result: CrisisDetectionResult = {
        detected: true,
        type: detectedType,
        keywords: matchedKeywords,
        confidence,
        suggestedAction:
          confidence > 0.8
            ? 'Please reach out to a crisis helpline immediately'
            : 'Support resources are available if you need them',
        showResources: confidence > 0.5,
      };

      setDetectionResult(result);

      if (confidence > 0.8) {
        setShowCrisisDialog(true);
        toast({
          title: 'Crisis support available',
          description:
            result.suggestedAction ||
            'Click the SOS button for immediate support resources',
        });
      } else if (confidence > 0.5) {
        toast({
          title: 'Support resources available',
          description:
            'We noticed you might need support. Click the SOS button for help.',
        });
      }

      // Also call server-side detection for high confidence
      if (confidence > 0.6) {
        try {
          const serverResult = await detectCrisis(content);
          if (serverResult.detected) {
            setDetectionResult(serverResult);
          }
        } catch {
          // Client-side detection is sufficient as fallback
        }
      }
    },
    [toast],
  );

  const resetDetection = useCallback(() => {
    setDetectionResult(null);
    lastDetectedRef.current = '';
  }, []);

  return {
    detectCrisisKeywords,
    showCrisisDialog,
    setShowCrisisDialog,
    detectionResult,
    resetDetection,
  };
}
