#!/usr/bin/env python3
"""Join a Sidecar subject's episodes to git: the commits behind each episode.

Input: a saved getTopic response (the JSON the MCP tool returned) for one subject. For each
episode, commits are the hashes it names plus `git log --since=<start> --until=<end + slack>
-- <its files>` per repo; repos are folders under --workspace. Shared journal files are ignored.
Usage: python3 git_join.py topic.json [--workspace ~/workspace] [--slack-min 60]
"""
import argparse
import collections
import datetime as dt
import json
import pathlib
import subprocess

SHARED = ("issues.md", "rules.md", "workflow.md", "MEMORY.md", "CLAUDE.md")


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True).stdout


def topic_of(doc):
    while isinstance(doc, dict) and "episodes" not in doc:
        doc = doc.get("result") or doc.get("data")
    return doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("topic")
    ap.add_argument("--workspace", default=str(pathlib.Path.cwd().parent))
    ap.add_argument("--slack-min", type=int, default=60)
    args = ap.parse_args()
    ws = pathlib.Path(args.workspace).expanduser()
    topic = topic_of(json.load(open(args.topic)))
    print("# %s" % topic.get("label"))
    for e in topic["episodes"]:
        by_repo = collections.defaultdict(list)
        for f in e.get("files") or []:
            repo = f.get("repo") or f["path"].split("/", 1)[0]
            rel = f["path"][len(repo) + 1:] if f["path"].startswith(repo + "/") else f["path"]
            if (ws / repo / ".git").exists() and not rel.endswith(SHARED):
                by_repo[repo].append(rel)
        since = dt.datetime.fromtimestamp(e["startMs"] / 1000, dt.timezone.utc) - dt.timedelta(minutes=5)
        until = dt.datetime.fromtimestamp(e["endMs"] / 1000, dt.timezone.utc) + dt.timedelta(minutes=args.slack_min)
        print("\n## %s (%s → %s)" % (e.get("area") or e.get("subject"), since.strftime("%Y-%m-%d %H:%M"),
                                     until.strftime("%Y-%m-%d %H:%M")))
        seen = set()
        for repo, rels in by_repo.items():
            out = git(ws / repo, "log", "--since=" + since.isoformat(), "--until=" + until.isoformat(),
                      "--format=%h %ad %s", "--date=short", "--", *rels)
            for line in out.strip().splitlines():
                seen.add(line.split()[0])
                print("- %s %s" % (repo, line))
        named = [h for h in (e.get("commits") or {}).get("hashes", []) if h not in seen]
        if named:
            print("- named in the record (find the repo with `git show`): " + ", ".join(named))
        if not by_repo and not named:
            print("- no files or commits recorded: search the episode's executions")


if __name__ == "__main__":
    main()
