#!/bin/bash

# Function to commit and sleep
commit_files() {
    files=$1
    message=$2
    echo "Adding: $files"
    git add $files
    git commit -m "$message"
    echo "Committed: $message. Waiting 3 minutes..."
    sleep 180
}

# Commit 1: Project Initialization & Docs
commit_files ".gitignore README.md" "init: project scaffolding and documentation"

# Commit 2: Configuration
commit_files "foundry.toml remappings.txt" "config: foundry and dependency mappings"

# Commit 3: Core Implementation
commit_files "contracts/WraithHook.sol" "feat: implement WraithHook with Poison Hook and Quantum Exit"

# Commit 4: Tests
commit_files "test/WraithGuard.t.sol" "test: comprehensive suite for rug simulation and rescue"

# Commit 5: AI Sentinel
commit_files "agents/sentinel.py" "feat: add Gensyn AEL sentinel for toxicity analysis"

# Commit 6: Automation Scripts
commit_files "scripts/keeper_relay.js" "feat: add KeeperHub relay for flash-rescue automation"

# Commit 7: Frontend Prompt
commit_files "FRONTEND_PROMPT.md" "docs: add comprehensive frontend build prompt"

echo "All commits completed successfully."
