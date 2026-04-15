#!/usr/bin/env bash
set -euo pipefail
WORKDIR="${1:?usage: run_codex_ralph_loop.sh <workdir> <prd-json> <progress-file>}"
PRD_JSON="${2:?usage: run_codex_ralph_loop.sh <workdir> <prd-json> <progress-file>}"
PROGRESS_FILE="${3:?usage: run_codex_ralph_loop.sh <workdir> <prd-json> <progress-file>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_SCRIPT="${SCRIPT_DIR}/ralph_state.py"
MAX_ITERS="${MAX_ITERS:-6}"
BRANCH_NAME="${BRANCH_NAME:-codex/$(basename "$WORKDIR" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')}"
DEPLOY_CMD="${DEPLOY_CMD:-}"
PRD_MD="${PRD_MD:-$(dirname "$PRD_JSON")/PRD.md}"
command -v codex >/dev/null
command -v git >/dev/null
command -v python3 >/dev/null
[ -f "$STATE_SCRIPT" ] && [ -f "$PRD_MD" ] && [ -f "$PRD_JSON" ] && [ -f "$PROGRESS_FILE" ]
mkdir -p "$WORKDIR/.codex/ralph"
cd "$WORKDIR"
USE_SKIP_GIT_REPO_CHECK=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURRENT_BRANCH="$(git branch --show-current)"
  if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
  fi
else
  USE_SKIP_GIT_REPO_CHECK=1
fi
LAST_VERIFY_SUMMARY="No verification has run yet."
for ITER in $(seq 1 "$MAX_ITERS"); do
  if ! python3 "$STATE_SCRIPT" has-open-tasks --prd-json "$PRD_JSON" >/dev/null; then
    if python3 "$STATE_SCRIPT" has-blocked-tasks --prd-json "$PRD_JSON" >/dev/null; then
      echo "loop stopped because blocked tasks remain in $PRD_JSON" >&2; exit 1
    fi
    OVERALL_VERIFY_SCRIPT="$WORKDIR/.codex/ralph/verify-overall.sh"
    OVERALL_VERIFY_LOG="$WORKDIR/.codex/ralph/verify-overall.log"
    python3 "$STATE_SCRIPT" overall-verify-snippet --prd-json "$PRD_JSON" >"$OVERALL_VERIFY_SCRIPT"
    chmod +x "$OVERALL_VERIFY_SCRIPT"
    set +e; bash "$OVERALL_VERIFY_SCRIPT" >"$OVERALL_VERIFY_LOG" 2>&1; OVERALL_VERIFY_EXIT=$?; set -e
    LAST_VERIFY_SUMMARY="overall verify exit=${OVERALL_VERIFY_EXIT}; log=$(basename "$OVERALL_VERIFY_LOG")"
    [ "$OVERALL_VERIFY_EXIT" -eq 0 ] || { echo "all tasks are marked completed but the overall acceptance checks still fail" >&2; echo "$LAST_VERIFY_SUMMARY" >&2; exit 1; }
    if [ -n "$DEPLOY_CMD" ]; then
      command -v railway >/dev/null
      railway whoami >/dev/null
      DEPLOY_LOG="$WORKDIR/.codex/ralph/deploy-final.log"
      bash -lc "$DEPLOY_CMD" >"$DEPLOY_LOG" 2>&1
    fi
    exit 0
  fi
  TASK_ID="$(python3 "$STATE_SCRIPT" current-task-field --prd-json "$PRD_JSON" --field id)"
  TASK_TITLE="$(python3 "$STATE_SCRIPT" current-task-field --prd-json "$PRD_JSON" --field title)"
  python3 "$STATE_SCRIPT" mark-task --prd-json "$PRD_JSON" --task-id "$TASK_ID" --status in_progress >/dev/null
  STATUS_FILE="$WORKDIR/.codex/ralph/git-status.txt"
  DIFFSTAT_FILE="$WORKDIR/.codex/ralph/git-diff-stat.txt"
  PACKET_FILE="$WORKDIR/.codex/ralph/context-packet.md"
  OUT_FILE="$WORKDIR/.codex/ralph/codex-last-message.txt"
  VERIFY_SCRIPT="$WORKDIR/.codex/ralph/verify-current-task.sh"
  VERIFY_LOG="$WORKDIR/.codex/ralph/verify-${ITER}.log"
  git status --short >"$STATUS_FILE" 2>/dev/null || true
  git diff --stat >"$DIFFSTAT_FILE" 2>/dev/null || true
  python3 "$STATE_SCRIPT" render-packet --prd-json "$PRD_JSON" --prd-md "$PRD_MD" --progress "$PROGRESS_FILE" --repo-status "$STATUS_FILE" --diffstat "$DIFFSTAT_FILE" --verify-summary "$LAST_VERIFY_SUMMARY" --iteration "$ITER" >"$PACKET_FILE"
  CODEX_ARGS=(exec --cd "$WORKDIR" --output-last-message "$OUT_FILE")
  if [ "$USE_SKIP_GIT_REPO_CHECK" -eq 1 ]; then CODEX_ARGS+=(--skip-git-repo-check); fi
  codex "${CODEX_ARGS[@]}" <"$PACKET_FILE"
  python3 "$STATE_SCRIPT" verify-snippet --prd-json "$PRD_JSON" >"$VERIFY_SCRIPT"
  chmod +x "$VERIFY_SCRIPT"
  set +e; bash "$VERIFY_SCRIPT" >"$VERIFY_LOG" 2>&1; VERIFY_EXIT=$?; set -e
  LAST_VERIFY_SUMMARY="task=${TASK_ID} verify exit=${VERIFY_EXIT}; log=$(basename "$VERIFY_LOG")"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git add -A
    if ! git diff --cached --quiet; then git commit -m "codex: checkpoint iteration ${ITER} (${TASK_ID})" >/dev/null 2>&1 || true; fi
  fi
  if [ "$VERIFY_EXIT" -eq 0 ]; then python3 "$STATE_SCRIPT" mark-task --prd-json "$PRD_JSON" --task-id "$TASK_ID" --status completed >/dev/null; fi
  python3 "$STATE_SCRIPT" record-progress --progress "$PROGRESS_FILE" --iteration "$ITER" --task-id "$TASK_ID" --task-title "$TASK_TITLE" --verify-exit "$VERIFY_EXIT" --verify-log "$VERIFY_LOG" --codex-message-file "$OUT_FILE" --status "$(python3 "$STATE_SCRIPT" current-status --prd-json "$PRD_JSON" --task-id "$TASK_ID")" >/dev/null
done
echo "loop finished without completing all tasks or passing the final acceptance checks" >&2
exit 1
