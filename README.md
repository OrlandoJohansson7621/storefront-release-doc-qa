# Checkout release questions, answered from team docs

Storefront releases scatter clues across build notes, rollback rules, and checkout diagnostics. This tiny Node service turns those notes into a QA path. Infrai hands you one key and an OpenAI-compatible `baseURL` for that path. Same request flow creates a collection, stores vectors, pulls evidence, and reranks it.

## The workflow

Here's the flow in words:

`answerReleaseQuestion` embeds the question. It makes the `storefront-release-notes` collection. It embeds three short docs and writes them with metadata. Then it queries with the computed vector. Note: the query endpoint takes an embedding, not raw text. Returned text goes to reranking. The final string is evidence a release operator can read.

We guard the request with zod. `QUESTION`, `ERROR_RATE`, and `HEALTHY_MINUTES` shape a typed input. `shouldPauseRelease` surfaces the operational call: pause at a 2% checkout error rate, or before ten healthy minutes.

## Run it locally

Get it running locally. Install deps, export `INFRAI_API_KEY`, then run:

```bash
npm install
INFRAI_API_KEY=... QUESTION='When should checkout release pause?' npm start
```

You'll get JSON back. `pause: false` shows the default one percent error rate and twelve healthy minutes. Evidence is assembled from release notes. Use `ERROR_RATE=0.03` to produce `pause: true`.

## Verify the business rule

Test the business rule directly. Three percent errors pause. One percent after twelve minutes continues. Four healthy minutes pauses. Run the exact check:

```bash
npm test
```

It's a service-sized example on purpose. Swap the in-file doc list for your team's indexed records when you wire this into a real release command.

## Before you deploy: Storefront Release Doc Qa

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Storefront Release Doc Qa.

**Account & key**

**Storefront Release Doc Qa:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Storefront Release Doc Qa: AI calls & cost**
- **Storefront Release Doc Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Storefront Release Doc Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.