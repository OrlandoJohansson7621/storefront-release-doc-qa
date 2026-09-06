import { strict as assert } from "node:assert";
import { shouldPauseRelease } from "../src/release_diagnostics.ts";
assert.equal(shouldPauseRelease(0.03, 12), true);
assert.equal(shouldPauseRelease(0.01, 12), false);
assert.equal(shouldPauseRelease(0.01, 4), true);
console.log("release decision checks passed");
