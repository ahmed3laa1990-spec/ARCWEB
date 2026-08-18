#!/bin/bash
cd "$(dirname "$0")"
echo "================================================================"
echo "  ARCWEB — Pushing rebuild trigger to GitHub"
echo "================================================================"
echo ""
git log --oneline -3
echo ""
echo "→ Pushing to origin/main ..."
git push origin main 2>&1
PUSH_EXIT=$?
echo ""
echo "================================================================"
if [ $PUSH_EXIT -eq 0 ]; then
  echo "  ✅ SUCCESS — Vercel should now deploy commit 25c2b53 + 0f0986d"
  echo "  Watch: https://vercel.com/ahmed3laa1990-4515s-projects/arcweb"
else
  echo "  ❌ PUSH FAILED — check above for errors"
fi
echo "================================================================"
echo ""
echo "Press any key to close..."
read -n 1
