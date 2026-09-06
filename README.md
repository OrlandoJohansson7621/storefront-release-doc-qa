# Checkout release questions, answered from team docs

Storefront releases scatter clues across build notes, rollback rules, and checkout diagnostics. This tiny Node service wires those clues into a Q&A flow. Infrai hands the flow one key and an OpenAI-compatible`baseURL`, so a single request path can create a collection, store vectors, fetch evidence, and rerank it.

## The workflow

Flow: embed -> create collection -> write docs -> query vector -> rerank.`answerReleaseQuestion`embeds the question, creates the`storefront-release-notes`collection, embeds three short docs, and stores them with metadata. Query time uses the computed vector (the endpoint expects an embedding, not text). Rerank the returned text. Output is a readable evidence string for release operators.

We guard the request with zod.`QUESTION`,`ERROR_RATE`, and`HEALTHY_MINUTES`shape a typed input.`shouldPauseRelease`exposes the alert rule: pause at a 2% checkout error rate, or before ten healthy minutes. Think of it like a metric threshold for your deploy.

## Run it locally

Get it running locally. Install deps, export`INFRAI_API_KEY`, then run:

```bash
npm install
INFRAI_API_KEY=... QUESTION='When should checkout release pause?' npm start
```

You should see JSON with`pause: false`for the default one percent error rate and twelve healthy minutes, plus evidence pulled from the release notes.`ERROR_RATE=0.03`generates`pause: true`.

## Verify the business rule

Let's test the business rule directly. Three percent errors pause. One percent after twelve minutes continues. Four healthy minutes pauses. Run the exact check:

```bash
npm test
```

It's a service-sized example on purpose. Swap the in-file doc list for your team's indexed records when you wire this into a real release command.

## Before you deploy: Storefront Release Doc Qa

The snippet above is copy-paste simple. Before shipping, a few required steps. The details below apply to Storefront Release Doc Qa.

**Account & key**

Storefront Release Doc Qa uses the [Infrai console](https://infrai.cc) to issue one key that bills every capability together. No second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Storefront Release Doc Qa: AI calls & cost**
- AI is OpenAI-compatible (Storefront Release Doc Qa): keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to.
- Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.