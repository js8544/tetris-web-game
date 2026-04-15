#!/usr/bin/env python3
import argparse
import json
import os
import pathlib
import sys
from typing import Any

VALID_STATUS = {"pending", "in_progress", "completed", "blocked"}

def load_plan(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise SystemExit("prd.json must be a JSON object")
    tasks = data.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise SystemExit("prd.json must contain a non-empty tasks array")
    for task in tasks:
        if not isinstance(task, dict):
            raise SystemExit("each task must be a JSON object")
        status = task.get("status", "pending")
        if status not in VALID_STATUS:
            raise SystemExit(f"invalid task status: {status}")
        task["status"] = status
        task.setdefault("acceptance_checks", [])
    data.setdefault("acceptance_checks", [])
    return data

def save_plan(path: str, data: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=True, indent=2)
        fh.write("\n")

def current_task(plan: dict[str, Any]) -> dict[str, Any] | None:
    tasks = plan["tasks"]
    for preferred in ("in_progress", "pending"):
        for task in tasks:
            if task.get("status") == preferred:
                return task
    return None

def read_text(path: str) -> str:
    if not path or not os.path.exists(path):
        return ""
    return pathlib.Path(path).read_text(encoding="utf-8")

def format_checks(checks: list[str]) -> str:
    if not checks:
        return "- none provided"
    return "\n".join(f"- {check}" for check in checks)

def cmd_current_task_field(args: argparse.Namespace) -> int:
    task = current_task(load_plan(args.prd_json))
    if task is None:
        return 1
    value = task.get(args.field, "")
    if isinstance(value, list):
        print("\n".join(str(item) for item in value))
    else:
        print(value)
    return 0

def cmd_has_open_tasks(args: argparse.Namespace) -> int:
    task = current_task(load_plan(args.prd_json))
    return 0 if task is not None else 1

def cmd_has_blocked_tasks(args: argparse.Namespace) -> int:
    plan = load_plan(args.prd_json)
    for task in plan["tasks"]:
        if task.get("status") == "blocked":
            return 0
    return 1

def cmd_mark_task(args: argparse.Namespace) -> int:
    plan = load_plan(args.prd_json)
    for task in plan["tasks"]:
        if task.get("id") == args.task_id:
            task["status"] = args.status
            save_plan(args.prd_json, plan)
            return 0
    raise SystemExit(f"task not found: {args.task_id}")

def cmd_current_status(args: argparse.Namespace) -> int:
    plan = load_plan(args.prd_json)
    for task in plan["tasks"]:
        if task.get("id") == args.task_id:
            print(task.get("status", "pending"))
            return 0
    raise SystemExit(f"task not found: {args.task_id}")

def cmd_verify_snippet(args: argparse.Namespace) -> int:
    plan = load_plan(args.prd_json)
    task = current_task(plan)
    if task is None:
        return cmd_overall_verify_snippet(args)
    checks = task.get("acceptance_checks") or plan.get("acceptance_checks") or []
    print("#!/usr/bin/env bash")
    print("set -euo pipefail")
    for check in checks:
        print(check)
    return 0

def cmd_overall_verify_snippet(args: argparse.Namespace) -> int:
    plan = load_plan(args.prd_json)
    checks = plan.get("acceptance_checks") or []
    print("#!/usr/bin/env bash")
    print("set -euo pipefail")
    for check in checks:
        print(check)
    return 0

def cmd_render_packet(args: argparse.Namespace) -> int:
    plan = load_plan(args.prd_json)
    task = current_task(plan)
    if task is None:
        raise SystemExit("no open task remains")
    prd_text = read_text(args.prd_md).strip()
    if prd_text:
        prd_text = "\n".join(prd_text.splitlines()[:80])
    progress_text = read_text(args.progress).strip()
    if progress_text:
        progress_text = "\n".join(progress_text.splitlines()[-40:])
    repo_status = read_text(args.repo_status).strip()
    diffstat = read_text(args.diffstat).strip()
    outstanding = "\n".join(
        f"- [{item.get('status', 'pending')}] {item.get('id', '')} {item.get('title', '').strip()}".strip()
        for item in plan["tasks"] if item.get("status") != "completed"
    )
    print("# Ralph Context Packet\n")
    print(f"Iteration: {args.iteration}\n")
    print("## Objective")
    print(plan.get("objective", "").strip() or "No objective recorded.")
    print("\n## PRD Summary")
    print(prd_text or "PRD.md is present but empty.")
    print("\n## Overall Acceptance Checks")
    print(format_checks(plan.get("acceptance_checks") or []))
    print("\n## Current Task")
    print(f"- id: {task.get('id', '')}")
    print(f"- title: {task.get('title', '')}")
    print(f"- status: {task.get('status', '')}")
    print(f"- goal: {task.get('goal', '')}\n")
    instructions = task.get("instructions", "").strip()
    if instructions:
        print("## Task Instructions")
        print(instructions)
        print()
    print("## Current Task Acceptance Checks")
    print(format_checks(task.get("acceptance_checks") or plan.get("acceptance_checks") or []))
    print("\n## Outstanding Tasks")
    print(outstanding or "- none")
    print("\n## Recent Progress")
    print(progress_text or "No progress has been recorded yet.")
    print("\n## Working Tree")
    print(repo_status or "(clean or unavailable)")
    print("\n## Diff Stat")
    print(diffstat or "(none)")
    print("\n## Latest Verification Summary")
    print(args.verify_summary)
    print("\n## Instructions For Codex")
    print("- Work only on the current task above.")
    print("- Edit files in place in the repository.")
    print("- Stop after making the highest-value bounded progress for this task.")
    print("- Do not claim completion without passing the current task acceptance checks.")
    return 0

def cmd_record_progress(args: argparse.Namespace) -> int:
    lines = [
        f"Iteration {args.iteration}",
        f"Task: {args.task_id} - {args.task_title}",
        f"Status after iteration: {args.status}",
        f"Verify exit: {args.verify_exit}",
        f"Verify log: {args.verify_log}",
    ]
    codex_message = read_text(args.codex_message_file).strip()
    if codex_message:
        excerpt = "\n".join(codex_message.splitlines()[:20])
        lines.append("Codex last message:")
        lines.append(excerpt)
    lines.append("")
    pathlib.Path(args.progress).parent.mkdir(parents=True, exist_ok=True)
    with open(args.progress, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
        fh.write("\n")
    return 0

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("current-task-field"); p.add_argument("--prd-json", required=True); p.add_argument("--field", required=True); p.set_defaults(func=cmd_current_task_field)
    p = sub.add_parser("has-open-tasks"); p.add_argument("--prd-json", required=True); p.set_defaults(func=cmd_has_open_tasks)
    p = sub.add_parser("has-blocked-tasks"); p.add_argument("--prd-json", required=True); p.set_defaults(func=cmd_has_blocked_tasks)
    p = sub.add_parser("mark-task"); p.add_argument("--prd-json", required=True); p.add_argument("--task-id", required=True); p.add_argument("--status", required=True, choices=sorted(VALID_STATUS)); p.set_defaults(func=cmd_mark_task)
    p = sub.add_parser("current-status"); p.add_argument("--prd-json", required=True); p.add_argument("--task-id", required=True); p.set_defaults(func=cmd_current_status)
    p = sub.add_parser("verify-snippet"); p.add_argument("--prd-json", required=True); p.set_defaults(func=cmd_verify_snippet)
    p = sub.add_parser("overall-verify-snippet"); p.add_argument("--prd-json", required=True); p.set_defaults(func=cmd_overall_verify_snippet)
    p = sub.add_parser("render-packet"); p.add_argument("--prd-json", required=True); p.add_argument("--prd-md", required=True); p.add_argument("--progress", required=True); p.add_argument("--repo-status", required=True); p.add_argument("--diffstat", required=True); p.add_argument("--verify-summary", required=True); p.add_argument("--iteration", required=True); p.set_defaults(func=cmd_render_packet)
    p = sub.add_parser("record-progress"); p.add_argument("--progress", required=True); p.add_argument("--iteration", required=True); p.add_argument("--task-id", required=True); p.add_argument("--task-title", required=True); p.add_argument("--verify-exit", required=True); p.add_argument("--verify-log", required=True); p.add_argument("--codex-message-file", required=True); p.add_argument("--status", required=True); p.set_defaults(func=cmd_record_progress)
    return parser

def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__":
    sys.exit(main())
