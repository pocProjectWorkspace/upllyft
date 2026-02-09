// Assessment interpretation and recommendation helpers

export type ZoneType = 'green' | 'yellow' | 'red';

export interface Recommendation {
    severity: 'Mild' | 'Moderate' | 'Severe';
    intervention: string;
}

/**
 * Calculate zone based on risk index
 * Green: 0-0.29 (low risk)
 * Yellow: 0.30-0.45 (moderate risk)
 * Red: 0.46+ (high risk)
 */
export function calculateZone(riskIndex: number): ZoneType {
    if (riskIndex <= 0.29) return 'green';
    if (riskIndex <= 0.45) return 'yellow';
    return 'red';
}

/**
 * Generate domain-specific interpretation based on zone and domain
 */
export function generateDomainInterpretation(
    domainId: string,
    domainName: string,
    riskIndex: number,
    zone: ZoneType
): string {
    const riskPercent = (riskIndex * 100).toFixed(0);

    if (zone === 'green') {
        return `${domainName} development appears to be progressing well. The child is meeting expected milestones in this area with a low risk index of ${riskPercent}%.`;
    } else if (zone === 'yellow') {
        return `${domainName} shows some areas that may benefit from monitoring. The moderate risk index of ${riskPercent}% suggests keeping an eye on development in this domain and considering supportive activities.`;
    } else {
        return `${domainName} indicates concerns that warrant attention. With a risk index of ${riskPercent}%, it is recommended to consult with a developmental specialist for further evaluation and intervention strategies.`;
    }
}

/**
 * Generate recommendations based on domain and zone
 */
export function generateRecommendations(
    domainId: string,
    domainName: string,
    zone: ZoneType
): Recommendation[] {
    if (zone === 'green') {
        return [];
    }

    const recommendations: Recommendation[] = [];

    // Domain-specific recommendations
    const domainRecommendations: Record<string, Record<string, Recommendation[]>> = {
        grossMotor: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Encourage active play and outdoor activities. Provide opportunities for climbing, jumping, and running in safe environments.'
                }
            ],
            red: [
                {
                    severity: 'Moderate',
                    intervention: 'Consult with a pediatric physical therapist for assessment and targeted exercises.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Implement structured gross motor activities daily, focusing on balance and coordination.'
                }
            ]
        },
        fineMotor: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Provide activities that develop hand-eye coordination such as puzzles, building blocks, and drawing.'
                }
            ],
            red: [
                {
                    severity: 'Moderate',
                    intervention: 'Seek occupational therapy evaluation for fine motor skill development.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Practice daily activities involving grasping, cutting, and manipulating small objects.'
                }
            ]
        },
        speechLanguage: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Engage in frequent conversations, read books together daily, and expand on the child\'s utterances.'
                }
            ],
            red: [
                {
                    severity: 'Severe',
                    intervention: 'Immediate referral to a speech-language pathologist for comprehensive evaluation.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Create a language-rich environment with consistent modeling and repetition.'
                }
            ]
        },
        socialEmotional: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Facilitate peer interactions through playdates and group activities. Model emotional regulation strategies.'
                }
            ],
            red: [
                {
                    severity: 'Moderate',
                    intervention: 'Consider consultation with a child psychologist or developmental specialist.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Implement structured social skills training and emotional literacy activities.'
                }
            ]
        },
        cognitiveLearning: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Provide age-appropriate puzzles, sorting games, and problem-solving activities.'
                }
            ],
            red: [
                {
                    severity: 'Moderate',
                    intervention: 'Seek educational psychology assessment to identify specific learning needs.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Implement individualized learning strategies and consider early intervention services.'
                }
            ]
        },
        adaptiveSelfCare: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Break down self-care tasks into smaller steps and provide consistent practice opportunities.'
                }
            ],
            red: [
                {
                    severity: 'Moderate',
                    intervention: 'Consult with an occupational therapist for adaptive skills training.'
                },
                {
                    severity: 'Mild',
                    intervention: 'Create visual schedules and use positive reinforcement for self-care routines.'
                }
            ]
        },
        sensoryProcessing: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Observe and document sensory preferences. Provide sensory-friendly environments when possible.'
                }
            ],
            red: [
                {
                    severity: 'Moderate',
                    intervention: 'Referral to occupational therapist specializing in sensory integration.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Implement sensory diet and environmental modifications based on professional guidance.'
                }
            ]
        },
        visionHearing: {
            yellow: [
                {
                    severity: 'Mild',
                    intervention: 'Schedule comprehensive vision and hearing screenings with appropriate specialists.'
                }
            ],
            red: [
                {
                    severity: 'Severe',
                    intervention: 'Immediate referral to pediatric ophthalmologist and audiologist for thorough evaluation.'
                },
                {
                    severity: 'Moderate',
                    intervention: 'Ensure child is seated optimally in classroom and home settings while awaiting evaluation.'
                }
            ]
        }
    };

    const domainRecs = domainRecommendations[domainId]?.[zone] || [];

    if (domainRecs.length > 0) {
        return domainRecs;
    }

    // Generic fallback recommendations
    if (zone === 'yellow') {
        return [
            {
                severity: 'Mild',
                intervention: `Monitor ${domainName} development closely and provide enrichment activities in this area.`
            }
        ];
    } else {
        return [
            {
                severity: 'Moderate',
                intervention: `Consult with a developmental specialist for comprehensive evaluation of ${domainName}.`
            }
        ];
    }
}

/**
 * Calculate developmental age equivalent based on overall score
 * This is a simplified calculation - in production, this should be based on
 * normative data and age-specific scoring tables
 */
export function calculateDevelopmentalAge(
    totalScore: number,
    maxPossible: number,
    chronologicalAgeMonths: number
): string {
    const scorePercentage = (totalScore / maxPossible) * 100;

    // Simplified calculation: adjust chronological age by score percentage
    const developmentalAgeMonths = Math.round((chronologicalAgeMonths * scorePercentage) / 100);

    const years = Math.floor(developmentalAgeMonths / 12);
    const months = developmentalAgeMonths % 12;

    if (years === 0) {
        return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
        return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
}

/**
 * Generate overall interpretation based on total score and flagged domains
 */
export function generateOverallInterpretation(
    totalScore: number,
    maxPossible: number,
    flaggedDomainsCount: number,
    totalDomains: number
): string {
    const scorePercentage = (totalScore / maxPossible) * 100;

    if (scorePercentage >= 85 && flaggedDomainsCount === 0) {
        return 'The child demonstrates strong developmental progress across all assessed domains. Continue to provide enriching experiences and monitor development regularly.';
    } else if (scorePercentage >= 70 && flaggedDomainsCount <= 2) {
        return `The child shows generally positive development with ${flaggedDomainsCount} domain${flaggedDomainsCount !== 1 ? 's' : ''} requiring attention. Targeted support in these areas is recommended while continuing to nurture strengths.`;
    } else if (scorePercentage >= 50) {
        return `The assessment indicates multiple areas (${flaggedDomainsCount} of ${totalDomains} domains) that would benefit from intervention. A comprehensive evaluation by developmental specialists is recommended to create an individualized support plan.`;
    } else {
        return `The results suggest significant developmental concerns across multiple domains. Immediate consultation with a multidisciplinary team of specialists is strongly recommended to ensure the child receives appropriate support and intervention services.`;
    }
}
