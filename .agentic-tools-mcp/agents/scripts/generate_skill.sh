#!/usr/bin/env bash

# Agent Skill Generator
# Usage: ./generate_skill.sh "skill-name" "Skill Description" "instructions_file.md"

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 \"skill-name\" \"Skill Description\" \"instructions_file.md\""
    exit 1
fi

SKILL_NAME=$1
SKILL_DESC=$2
INSTRUCTIONS_FILE=$3

SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/skills"
TARGET_DIR="$SKILLS_DIR/$SKILL_NAME"
TARGET_FILE="$TARGET_DIR/SKILL.md"

if [ ! -f "$INSTRUCTIONS_FILE" ]; then
    echo "Error: Instructions file '$INSTRUCTIONS_FILE' not found."
    exit 1
fi

mkdir -p "$TARGET_DIR"

# Write YAML Frontmatter
echo "---" > "$TARGET_FILE"
echo "name: $SKILL_NAME" >> "$TARGET_FILE"
echo "description: $SKILL_DESC" >> "$TARGET_FILE"
echo "---" >> "$TARGET_FILE"
echo "" >> "$TARGET_FILE"

# Append Body
cat "$INSTRUCTIONS_FILE" >> "$TARGET_FILE"

echo "Success: Skill '$SKILL_NAME' created at $TARGET_FILE"
