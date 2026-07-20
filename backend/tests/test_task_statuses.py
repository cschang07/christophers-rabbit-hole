"""Regression: task status allow-list includes future and rejects unknowns.

Dependency-neutral: stdlib only. The repo has no pytest/FastAPI test harness
on the host, so this parses models.py / tasks.py instead of importing the app.
"""

from __future__ import annotations

import ast
import pathlib
import unittest

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
MODELS_PATH = BACKEND_ROOT / "app" / "models.py"
TASKS_ROUTER_PATH = BACKEND_ROOT / "app" / "routers" / "tasks.py"

EXPECTED_STATUSES = ("future", "todo", "in_progress", "done")


def _load_task_statuses() -> tuple[str, ...]:
    tree = ast.parse(MODELS_PATH.read_text(encoding="utf-8"))
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == "TASK_STATUSES":
                value = ast.literal_eval(node.value)
                if not isinstance(value, tuple) or not all(
                    isinstance(item, str) for item in value
                ):
                    raise AssertionError("TASK_STATUSES must be a tuple[str, ...]")
                return value
    raise AssertionError("TASK_STATUSES not found in models.py")


def _status_is_allowed(status: str | None, allowed: tuple[str, ...]) -> bool:
    """Mirrors routers.tasks._validate membership check for status."""
    if status is None:
        return True
    return status in allowed


class TestTaskStatuses(unittest.TestCase):
    def test_task_statuses_include_future_first(self) -> None:
        statuses = _load_task_statuses()
        self.assertEqual(statuses, EXPECTED_STATUSES)
        self.assertEqual(statuses[0], "future")

    def test_accepts_future_and_existing_statuses(self) -> None:
        statuses = _load_task_statuses()
        for status in EXPECTED_STATUSES:
            with self.subTest(status=status):
                self.assertTrue(_status_is_allowed(status, statuses))

    def test_rejects_unknown_status(self) -> None:
        statuses = _load_task_statuses()
        for bad in ("pending", "backlog", "doing", "complete", "將來", ""):
            with self.subTest(status=bad):
                self.assertFalse(_status_is_allowed(bad, statuses))

    def test_tasks_router_validates_against_task_statuses(self) -> None:
        source = TASKS_ROUTER_PATH.read_text(encoding="utf-8")
        self.assertIn("TASK_STATUSES", source)
        self.assertIn("status not in TASK_STATUSES", source)


if __name__ == "__main__":
    unittest.main()
