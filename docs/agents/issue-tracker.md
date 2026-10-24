# Issue tracker

Issues and specs live in GitHub Issues for
`rupertgermann/dough-planner-plus`. Use the `gh` CLI from this clone.

## Operations

- Create an issue with `gh issue create --title "..." --body-file <file>`.
- Read an issue with `gh issue view <number> --comments`.
- List issues with `gh issue list --state open --json number,title,body,labels`.
- Comment with `gh issue comment <number> --body-file <file>`.
- Apply labels with `gh issue edit <number> --add-label "..."`.
- Remove labels with `gh issue edit <number> --remove-label "..."`.
- Close an issue with `gh issue close <number> --comment "..."`.

When a skill says "publish to the issue tracker", create a GitHub issue.
When a skill says "fetch the relevant ticket", read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: no.**
