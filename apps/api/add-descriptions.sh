#!/bin/bash

# Script to add domain descriptions to the 3-4-years.json file

FILE="/Users/sutharsanparthasaarathy/Desktop/Workspace/Haven/SafeHaven-Api/src/assessments/questionnaires/3-4-years.json"

# Fine Motor & Visual-Motor
sed -i '' '/"id": "fineMotor"/,/"tier1": \[/ {
    /"name": "Fine Motor & Visual-Motor"/a\
            "description": "Fine motor skills involve precise movements of small muscles in the hands and fingers. These skills are crucial for self-care tasks (buttoning, zipping), academic activities (writing, cutting), and creative expression (drawing, building). Visual-motor integration combines what the eyes see with hand movements, essential for handwriting and many daily activities.",
}' "$FILE"

# Speech & Language
sed -i '' '/"id": "speechLanguage"/,/"tier1": \[/ {
    /"name": "Speech & Language"/a\
            "description": "Speech and language development encompasses both the ability to produce clear sounds (speech) and to understand and use words meaningfully (language). Strong communication skills are fundamental for expressing needs, building relationships, learning in school, and participating fully in social situations. Delays in this area can impact all aspects of development.",
}' "$FILE"

# Social & Emotional
sed -i '' '/"id": "socialEmotional"/,/"tier1": \[/ {
    /"name": "Social & Emotional"/a\
            "description": "Social-emotional development includes the ability to understand and manage emotions, form positive relationships, and navigate social situations. These skills are critical for mental health, school readiness, and lifelong success. Children who develop strong social-emotional skills are better equipped to handle stress, resolve conflicts, and build meaningful connections with others.",
}' "$FILE"

# Cognitive / Learning
sed -i '' '/"id": "cognitiveLearning"/,/"tier1": \[/ {
    /"name": "Cognitive \/ Learning"/a\
            "description": "Cognitive development involves thinking, problem-solving, memory, and understanding concepts. These skills form the foundation for academic learning and everyday decision-making. Strong cognitive abilities help children make sense of their world, learn new information, and apply knowledge in different contexts.",
}' "$FILE"

# Adaptive & Self-Care
sed -i '' '/"id": "adaptiveSelfCare"/,/"tier1": \[/ {
    /"name": "Adaptive & Self-Care"/a\
            "description": "Adaptive skills are practical life skills needed for independence, including dressing, eating, toileting, and personal hygiene. Mastering these skills builds confidence, reduces dependence on caregivers, and is essential for success in school and community settings. These abilities reflect a child'\''s growing autonomy and self-management.",
}' "$FILE"

# Sensory Processing
sed -i '' '/"id": "sensoryProcessing"/,/"tier1": \[/ {
    /"name": "Sensory Processing"/a\
            "description": "Sensory processing is how the brain receives and responds to information from the senses (touch, sound, sight, taste, smell, movement, body position). Difficulties in this area can affect attention, behavior, motor skills, and emotional regulation. Understanding a child'\''s sensory needs helps create supportive environments for learning and development.",
}' "$FILE"

# Vision & Hearing
sed -i '' '/"id": "visionHearing"/,/"tier1": \[/ {
    /"name": "Vision & Hearing"/a\
            "description": "Vision and hearing are the primary channels through which children learn about their environment. Clear vision is essential for reading, writing, and visual-motor tasks, while good hearing is critical for language development and communication. Early detection of vision or hearing problems can prevent delays in other developmental areas.",
}' "$FILE"

echo "Domain descriptions added successfully!"
