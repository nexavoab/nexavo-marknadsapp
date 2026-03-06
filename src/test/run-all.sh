#!/bin/bash
set -e
echo "=== UNIT TESTS ==="
npx vitest run src/test/unit/ --reporter=dot
echo "=== HOOK TESTS ==="
npx vitest run src/test/hooks/ --reporter=dot
echo "=== INTEGRATION TESTS ==="
npx vitest run src/test/integration/ --reporter=dot
echo "=== COMPONENT TESTS ==="
npx vitest run src/test/components/ --reporter=dot
echo ""
echo "✅ Alla tester passerade!"
