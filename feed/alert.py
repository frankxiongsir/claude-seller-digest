#!/usr/bin/env python3
"""Open, update or close alert issues from GitHub Actions. GitHub emails the assignee (the repo owner).

  python3 feed/alert.py build success|failure build.log   # after running feed/vercel-build.sh
  python3 feed/alert.py fresh                             # is yesterday's (US Eastern) day in data/archive/?
  python3 feed/alert.py fresh --close-only                # on push: close a late-data alert once the day is in, never open one

Without GITHUB_TOKEN it only prints what it would do (for local testing).
One open issue per kind: a repeat failure adds a comment, the next success closes it.
"""
import json, os, sys, urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

REPO = os.environ.get("GITHUB_REPOSITORY", "frankxiongsir/claude-seller-digest")
OWNER = os.environ.get("GITHUB_REPOSITORY_OWNER", REPO.split("/")[0])
TOKEN = os.environ.get("GITHUB_TOKEN", "")
SERVER = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
RUN = f"{SERVER}/{REPO}/actions/runs/{os.environ['GITHUB_RUN_ID']}" if os.environ.get("GITHUB_RUN_ID") else "(本地运行)"
SHA = os.environ.get("GITHUB_SHA", "")
SITE = "https://claude-seller-digest.vercel.app/"
TITLES = {"build": "[告警] 页面构建失败", "fresh": "[告警] 当天数据没有按时到达"}
ROOT = Path(__file__).resolve().parent.parent


def api(method, path, body=None):
    if not TOKEN:
        print(f"[dry-run] {method} {path}" + (f"\n{json.dumps(body, ensure_ascii=False, indent=1)}" if body else "")); return []
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "feed-alert"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or "null")


def open_issue(kind):
    for i in api("GET", "/issues?state=open&per_page=100") or []:
        if i.get("title", "").startswith(TITLES[kind]) and "pull_request" not in i: return i
    return None


def fail(kind, title_suffix, body):
    cur = open_issue(kind)
    if cur:
        api("POST", f"/issues/{cur['number']}/comments", {"body": "又失败了一次。\n\n" + body})
        print(f"commented on #{cur['number']}")
    else:
        api("POST", "/issues", {"title": f"{TITLES[kind]}：{title_suffix}", "body": body, "assignees": [OWNER]})
        print("opened alert issue")


def ok(kind, note):
    cur = open_issue(kind)
    if cur:
        api("POST", f"/issues/{cur['number']}/comments", {"body": note + "\n\n这个告警已自动关闭。"})
        api("PATCH", f"/issues/{cur['number']}", {"state": "closed", "state_reason": "completed"})
        print(f"closed #{cur['number']}")
    else:
        print("ok, no open alert")


def build(outcome, log_path):
    commit = f"{SERVER}/{REPO}/commit/{SHA}" if SHA else "(本地)"
    if outcome == "success":
        return ok("build", f"提交 {commit} 构建通过，线上页面已恢复正常更新。")
    log = Path(log_path).read_text(encoding="utf-8", errors="replace").splitlines() if Path(log_path).exists() else []
    problems = [l for l in log if l.lstrip().startswith(("✗", "-")) or "Error" in l or "Traceback" in l][:40]
    tail = "\n".join((problems or log[-60:])[-60:])
    body = (f"推送到 main 的提交 {commit} 没能生成页面。**线上页面停在上一个成功的版本**（{SITE}），新数据还没有发布。\n\n"
            f"**出错信息**\n\n```\n{tail}\n```\n\n"
            f"完整日志：{RUN}\n\n"
            "常见原因：当天的 day.json 格式不对（报错里会写是哪个字段），或 `feed/corrections.json` 里有条目对不上数据。"
            "修好后再推送一次，构建通过时这个告警会自动关闭。")
    fail("build", datetime.now(ZoneInfo("America/New_York")).strftime("%m-%d"), body)


def has_day(date):
    d = ROOT / "data" / "archive" / date
    return d.is_dir() and any((d / f).exists() for f in ("day.json", "posts.json"))


def fresh(close_only=False):
    now = datetime.now(ZoneInfo("America/New_York"))
    if close_only:
        # The open alert names the day it waited for; close it as soon as that day is pushed.
        cur = open_issue("fresh")
        if not cur: return print("no open late-data alert")
        want = cur["title"].rsplit("：", 1)[-1].strip()
        if has_day(want): ok("fresh", f"{want} 的数据已经到了（检查于美东 {now.strftime('%m-%d %H:%M')}）。")
        else: print(f"{want} still missing; alert stays open")
        return
    want = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    if has_day(want):
        return ok("fresh", f"{want} 的数据已经到了。")
    latest = sorted(x.name for x in (ROOT / "data" / "archive").iterdir() if x.is_dir() and x.name[:2] == "20")
    body = (f"到美东时间 {now.strftime('%m-%d %H:%M')}，仓库里还没有 **{want}** 的数据（`data/archive/{want}/` 下没有 day.json 或 posts.json）。"
            f"最近一期是 {latest[-1] if latest else '（无）'}。\n\n"
            "可能是抓取机器人当天没有运行或推送失败。页面会继续显示已有的日期，不会出错。"
            f"数据推上来后，下一次每日检查会自动关闭这个告警，也可以在 Actions 里手动运行 Feed checks。\n\n检查记录：{RUN}")
    fail("fresh", want, body)


if __name__ == "__main__":
    if sys.argv[1:2] == ["build"]: build(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "build.log")
    elif sys.argv[1:2] == ["fresh"]: fresh("--close-only" in sys.argv)
    else: sys.exit(__doc__)
