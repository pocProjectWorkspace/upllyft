#!/bin/bash

# Add domain descriptions to all questionnaire JSON files

DIR="/Users/sutharsanparthasaarathy/Desktop/Workspace/Haven/SafeHaven-Api/src/assessments/questionnaires"

for FILE in "$DIR"/*.json; do
    echo "Processing $FILE..."
    
    # Gross Motor
    if grep -q '"id": "grossMotor"' "$FILE"; then
        sed -i '' '/"id": "grossMotor"/,/"tier1": \[/ {
            /"name": "Gross Motor Development"/a\
            "description": "Gross motor skills involve large muscle movements like walking, running, jumping, and climbing. These skills are essential for physical independence, participation in sports and play, and overall health. Strong gross motor development supports balance, coordination, and body awareness, which are foundational for more complex physical activities and daily tasks.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Fine Motor
    if grep -q '"id": "fineMotor"' "$FILE"; then
        sed -i '' '/"id": "fineMotor"/,/"tier1": \[/ {
            /"name": "Fine Motor & Visual-Motor"/a\
            "description": "Fine motor skills involve precise movements of small muscles in the hands and fingers. These skills are crucial for self-care tasks (buttoning, zipping), academic activities (writing, cutting), and creative expression (drawing, building). Visual-motor integration combines what the eyes see with hand movements, essential for handwriting and many daily activities.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Speech & Language
    if grep -q '"id": "speechLanguage"' "$FILE"; then
        sed -i '' '/"id": "speechLanguage"/,/"tier1": \[/ {
            /"name": "Speech & Language"/a\
            "description": "Speech and language development encompasses both the ability to produce clear sounds (speech) and to understand and use words meaningfully (language). Strong communication skills are fundamental for expressing needs, building relationships, learning in school, and participating fully in social situations. Delays in this area can impact all aspects of development.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Social & Emotional
    if grep -q '"id": "socialEmotional"' "$FILE"; then
        sed -i '' '/"id": "socialEmotional"/,/"tier1": \[/ {
            /"name": "Social & Emotional"/a\
            "description": "Social-emotional development includes the ability to understand and manage emotions, form positive relationships, and navigate social situations. These skills are critical for mental health, school readiness, and lifelong success. Children who develop strong social-emotional skills are better equipped to handle stress, resolve conflicts, and build meaningful connections with others.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Cognitive / Learning
    if grep -q '"id": "cognitiveLearning"' "$FILE"; then
        sed -i '' '/"id": "cognitiveLearning"/,/"tier1": \[/ {
            /"name": "Cognitive \/ Learning"/a\
            "description": "Cognitive development involves thinking, problem-solving, memory, and understanding concepts. These skills form the foundation for academic learning and everyday decision-making. Strong cognitive abilities help children make sense of their world, learn new information, and apply knowledge in different contexts.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Adaptive & Self-Care
    if grep -q '"id": "adaptiveSelfCare"' "$FILE"; then
        sed -i '' '/"id": "adaptiveSelfCare"/,/"tier1": \[/ {
            /"name": "Adaptive & Self-Care"/a\
            "description": "Adaptive skills are practical life skills needed for independence, including dressing, eating, toileting, and personal hygiene. Mastering these skills builds confidence, reduces dependence on caregivers, and is essential for success in school and community settings. These abilities reflect a child'\''s growing autonomy and self-management.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Sensory Processing
    if grep -q '"id": "sensoryProcessing"' "$FILE"; then
        sed -i '' '/"id": "sensoryProcessing"/,/"tier1": \[/ {
            /"name": "Sensory Processing"/a\
            "description": "Sensory processing is how the brain receives and responds to information from the senses (touch, sound, sight, taste, smell, movement, body position). Difficulties in this area can affect attention, behavior, motor skills, and emotional regulation. Understanding a child'\''s sensory needs helps create supportive environments for learning and development.",
        }' "$FILE" 2>/dev/null || true
    fi
    
    # Vision & Hearing
    if grep -q '"id": "visionHearing"' "$FILE"; then
        sed -i '' '/"id": "visionHearing"/,/"tier1": \[/ {
            /"name": "Vision & Hearing"/a\
            "description": "Vision and hearing are the primary channels through which children learn about their environment. Clear vision is essential for reading, writing, and visual-motor tasks, while good hearing is critical for language development and communication. Early detection of vision or hearing problems can prevent delays in other developmental areas.",
        }' "$FILE" 2>/dev/null || true
    fi
done

echo "All domain descriptions added successfully!"
