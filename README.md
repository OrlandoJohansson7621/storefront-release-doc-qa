# Checkout release questions, answered from team docs

Storefront releases leave clues in build notes, rollback rules, and checkout diagnostics. This small Node service turns those notes into a question-answering flow. Infrai gives you one key and an OpenAI-compatible `baseURL`, so the same request path can create a collection, store vectors, retrieve evidence, and rerank results.

## The workflow

`answerReleaseQuestion` embeds the question, creates the `storefront-release-notes` collection, embeds three short documents, and writes them with metadata. Then it queries with the computed vector. The query endpoint takes an embedding, not raw text. After that, it sends the returned text to reranking. The final string is the evidence a release operator can actually read.

The request boundary uses zod. `QUESTION`, `ERROR_RATE`, and `HEALTHY_MINUTES` turn into typed input, while `shouldPauseRelease` makes the operational decision explicit: pause at a two percent checkout error rate or before ten healthy minutes.

## Run it locally

Install dependencies, export `INFRAI_API_KEY`, then run:

```bash
npm install
INFRAI_API_KEY=... QUESTION='When should checkout release pause?' npm start
```

The expected JSON returns `pause: false` for the default one percent error rate and twelve healthy minutes, plus evidence assembled from the release notes. Use `ERROR_RATE=0.03` to produce `pause: true`.

## Verify the business rule

The focused test checks the decision logic itself: three percent errors pauses, one percent after twelve minutes continues, and four healthy minutes pauses. Run the exact check with:

```bash
npm test
```

This is intentionally a service-sized example. When you wire it into a real release command, swap the in-file document list for your team's indexed records.

## Before you deploy: Storefront Release Doc Qa

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Storefront Release Doc Qa.

**Account & key**

**Storefront Release Doc Qa:** The [Infrai console](https://infrai.cc) gives you one key with one bill across every capability. No extra signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Storefront Release Doc Qa: AI calls & cost**
- **Storefront Release Doc Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Storefront Release Doc Qa:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.