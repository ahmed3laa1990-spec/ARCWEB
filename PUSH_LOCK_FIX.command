#!/bin/bash
# Double-click to push the lock icon fix to GitHub.
# Vercel will auto-deploy within 1-2 minutes.

cd "$(dirname "$0")"

echo "================================================================"
echo "  ARCWEB — Pushing portal link fix to GitHub"
echo "  Repo: https://github.com/ahmed3laa1990-spec/ARCWEB"
echo "================================================================"
echo ""
echo "→ Last commit:"
git log --oneline -1
echo ""
echo "→ Pushing to origin/main ..."
echo ""

git push -u origin main 2>&1

PUSH_EXIT=$?

echo ""
echo "================================================================"
if [ $PUSH_EXIT -eq 0 ]; then
  echo "  ✅ SUCCESS — Vercel will auto-deploy in 1-2 minutes"
  echo "  Watch: https://vercel.com/ahmed3laa1990-4515s-projects/arcweb"
else
  echo "  ❌ PUSH FAILED — exit code $PUSH_EXIT"
fi
echo "================================================================"
echo ""
echo "Press any key to close..."
read -n 1
