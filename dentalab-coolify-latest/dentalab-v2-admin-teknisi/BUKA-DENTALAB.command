#!/bin/zsh

cd "/Users/user/Documents/Codex/2026-07-14/saya-sedang-buat-lab-gigi-saya" || exit 1

export PATH="/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"

echo "Menjalankan DentaLab versi terbaru..."
echo "Biarkan jendela ini tetap terbuka selama DentaLab digunakan."
echo

exec pnpm dev
