#!/bin/bash

# Function to stage, commit, and push
drip_push() {
    files=$1
    message=$2
    echo "------------------------------------------------"
    echo "Staging: $files"
    git add $files
    echo "Committing: $message"
    git commit -m "$message"
    echo "Pushing to origin..."
    git push origin $(git rev-parse --abbrev-ref HEAD)
    echo "Done. Waiting 3 minutes before next push..."
    sleep 180
}

# 1. Core Contract & Config
drip_push "contracts/WraithHook.sol remappings.txt" "feat(core): update WraithHook implementation and update remappings"

# 2. Frontend Dependencies
drip_push "frontend/package.json frontend/package-lock.json" "build(frontend): synchronize package dependencies and lockfile"

# 3. Cleanup Legacy Pages
drip_push "frontend/src/app/admin/page.tsx frontend/src/app/pool/[poolId]/page.tsx" "refactor(frontend): remove deprecated admin and pool detail routes"

# 4. Landing & Config
drip_push "frontend/src/app/config.ts frontend/src/app/page.tsx" "feat(frontend): update application config and refresh landing page UI"

# 5. UI Protection & Providers
drip_push "frontend/src/app/protect/page.tsx frontend/src/app/providers.tsx" "feat(frontend): enhance protection dashboard and update global context providers"

# 6. Sentinel & Automation
drip_push "frontend/src/app/sentinel/page.tsx scripts/keeper_relay.js" "feat(automation): update sentinel monitoring UI and keeper relay logic"

# 7. Deployment Utilities
drip_push "script/DeployWraith.s.sol script/MineSalt.s.sol" "chore(deploy): update Wraith deployment scripts and salt mining utility"

# 8. Docs & Branding
drip_push "user_guide.md frontend/public/logo.png" "docs: update user guide instructions and refresh project logo"

# 9. New Protocol Contracts
drip_push "contracts/EternalEcho.sol contracts/QuantumPhantom.sol" "feat(protocol): add EternalEcho and QuantumPhantom privacy contracts"

# 10. Testing & Token Deployment
drip_push "contracts/test/ script/DeployTestTokens.s.sol" "test: implement core contract test suite and add test token deployment"

# 11. Liquidity Management
drip_push "script/InitializeWraithPool.s.sol script/SeedWraithLiquidity.s.sol" "chore(pool): add scripts for pool initialization and liquidity seeding"

# 12. Swap & Services
drip_push "script/SwapWraithPool.s.sol script/WraithServices.s.sol" "chore(services): add swap simulation scripts and service management tools"

# 13. Token Scripts & Workflow
drip_push "scripts/DeployTokens.s.sol scripts/workflow_update.json" "chore(workflow): add automated token deployment and update workflow config"

# 14. Info Pages
drip_push "frontend/src/app/info/" "feat(frontend): initialize information and documentation pages"

echo "All files have been staged, committed, and pushed in intervals."
