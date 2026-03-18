import test from "node:test";
import assert from "node:assert/strict";

import { isAllowedContactSubmissionOrigin } from "./origin.ts";

function buildRequest(url: string, headers: HeadersInit = {}) {
  return new Request(url, {
    method: "POST",
    headers,
  });
}

test("allows same-origin submissions", () => {
  const request = buildRequest("https://found-places.com/api/contact", {
    origin: "https://found-places.com",
  });

  assert.equal(isAllowedContactSubmissionOrigin(request, request.headers.get("origin")), true);
});

test("allows submissions from the forwarded public host", () => {
  const request = buildRequest("http://127.0.0.1:3000/api/contact", {
    origin: "https://found-places.com",
    "x-forwarded-host": "found-places.com",
    "x-forwarded-proto": "https",
  });

  assert.equal(isAllowedContactSubmissionOrigin(request, request.headers.get("origin")), true);
});

test("allows submissions from the configured public site url", () => {
  const request = buildRequest("http://frontend:3000/api/contact", {
    origin: "https://www.found-places.com",
  });

  assert.equal(
    isAllowedContactSubmissionOrigin(
      request,
      request.headers.get("origin"),
      "https://www.found-places.com/contact"
    ),
    true
  );
});

test("rejects malformed origins", () => {
  const request = buildRequest("https://found-places.com/api/contact", {
    origin: "not a url",
  });

  assert.equal(isAllowedContactSubmissionOrigin(request, request.headers.get("origin")), false);
});

test("rejects origins from other sites", () => {
  const request = buildRequest("https://found-places.com/api/contact", {
    origin: "https://evil.example",
  });

  assert.equal(isAllowedContactSubmissionOrigin(request, request.headers.get("origin")), false);
});
