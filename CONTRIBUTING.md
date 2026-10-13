# Contributing to ConAtlas TX

Thanks for helping fans find their next con! Most of the help ConAtlas needs is about the conventions themselves, and none of it needs code.

## Ways to help

Pick the form that fits:

- [Suggest a missing convention](https://github.com/hazeliscoding/conatlas-tx/issues/new?template=new-convention.yml)
- [Report incorrect dates or venue](https://github.com/hazeliscoding/conatlas-tx/issues/new?template=correction.yml)
- [Report a cancellation or postponement](https://github.com/hazeliscoding/conatlas-tx/issues/new?template=status-change.yml)
- [Fix an official link](https://github.com/hazeliscoding/conatlas-tx/issues/new?template=broken-link.yml)

The site's [Contribute page](https://hazeliscoding.github.io/conatlas-tx/contribute/) links to the same forms.

## The data rules

- **Official sources only.** Every date, venue, city and status comes from the organizer: their website, an announcement, a feed, or their own social account. Third-party listings and fan wikis are leads, never sources.
- **No guessed dates.** If the organizer hasn't announced dates, the listing says so. Dates are never inferred from last year's pattern.
- **A maintainer reviews every change** against the organizer before it's published.
- **Pull requests that add or change records put them in `data/drafts/`**, in the format described in [`data/README.md`](data/README.md). A maintainer moves them into `data/` once they check out.

The full policy is in [`docs/DATA_POLICY.md`](docs/DATA_POLICY.md).

## Working on the code

You need [Node.js 24+](https://nodejs.org) and [pnpm](https://pnpm.io) (`npm install -g pnpm`). Everything works in PowerShell, Command Prompt or any Unix shell.

```sh
pnpm install
pnpm dev             # open http://localhost:4321/conatlas-tx/
```

Before you open a pull request, run the same checks as CI:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm data:validate
pnpm build
pnpm test:e2e        # runs against the build; first time: pnpm exec playwright install chromium
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`, for example `fix(web): keep the filter bar hidden without JavaScript` or `docs: clarify the data policy`. Keep each commit to one change.

## Community

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see [SECURITY.md](SECURITY.md) instead of opening a public issue.
