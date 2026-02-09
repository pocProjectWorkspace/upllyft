export const ACTIVITY_PLAYBOOK: Record<string, Record<string, string[]>> = {
    '12-15months': {
        grossMotor: [
            "Encourage walking by placing toys on a low table just out of reach.",
            "Practice standing up from a sitting position without support."
        ],
        fineMotor: [
            "Provide blocks for stacking (2-3 blocks high).",
            "Practice putting small objects into a container and taking them out."
        ],
        communication: [
            "Read simple board books and point to pictures.",
            "Name everyday objects repeatedly to build vocabulary."
        ],
        personalSocial: [
            "Play simple games like peek-a-boo and patty-cake.",
            "Encourage imitation of simple gestures (waving bye-bye)."
        ],
        problemSolving: [
            "Hide a toy under a cloth and encourage finding it.",
            "Provide shape sorters with simple shapes (circle, square)."
        ]
    },
    '16-24months': {
        grossMotor: [
            "Encourage climbing on safe, low furniture or playground equipment.",
            "Practice kicking a ball while standing."
        ],
        fineMotor: [
            "Practice scribbling with crayons on paper.",
            "Encourage tower building with 4-6 blocks."
        ],
        communication: [
            "Ask simple questions ('Where is the ball?').",
            "Encourage 2-word phrases ('More juice', 'Daddy home')."
        ],
        personalSocial: [
            "Encourage spoon feeding with minimal help.",
            "Practice simple pretend play (feeding a doll)."
        ],
        problemSolving: [
            "Use simple puzzles with knobs.",
            "Encourage turning pages of a book one by one."
        ]
    },
    '24-36months': {
        grossMotor: [
            "Practice jumping with both feet off the ground.",
            "Encourage riding a tricycle or balance bike."
        ],
        fineMotor: [
            "String large wooden beads onto a shoelace.",
            "Practice cutting paper with child-safe scissors (sniping)."
        ],
        communication: [
            "Read longer stories and ask 'what happens next?'.",
            "Encourage naming colors and body parts."
        ],
        personalSocial: [
            "Encourage playing with other children (parallel play).",
            "Practice putting on simple clothing items (socks, hat)."
        ],
        problemSolving: [
            "Engage in matching games (matching identical pictures).",
            "Sort objects by color or shape."
        ]
    },
    // Add more age groups as needed or use generic fallbacks
    'default': {
        general: [
            "Consult with a pediatrician for specific age-appropriate activities.",
            "Engage in daily play and interaction."
        ]
    }
};
