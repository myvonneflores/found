import assert from "node:assert/strict";
import test from "node:test";

import { buildContactEmailPayload, buildContactEmailText, getContactEmailConfig } from "./email.ts";

test("getContactEmailConfig returns configured Resend values", () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousTo = process.env.CONTACT_TO_EMAIL;
  const previousFrom = process.env.CONTACT_FROM_EMAIL;

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.CONTACT_TO_EMAIL = "hello@found-places.com";
  process.env.CONTACT_FROM_EMAIL = "FOUND <hello@found-places.com>";

  try {
    assert.deepEqual(getContactEmailConfig(), {
      resendApiKey: "re_test_key",
      fromEmail: "FOUND <hello@found-places.com>",
      toEmail: "hello@found-places.com",
    });
  } finally {
    restoreEnv("RESEND_API_KEY", previousApiKey);
    restoreEnv("CONTACT_TO_EMAIL", previousTo);
    restoreEnv("CONTACT_FROM_EMAIL", previousFrom);
  }
});

test("getContactEmailConfig throws when Resend is not configured", () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    assert.throws(() => getContactEmailConfig(), /Contact email is not configured\./);
  } finally {
    restoreEnv("RESEND_API_KEY", previousApiKey);
  }
});

test("buildContactEmailPayload formats the contact email for reply workflow", () => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousTo = process.env.CONTACT_TO_EMAIL;
  const previousFrom = process.env.CONTACT_FROM_EMAIL;

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.CONTACT_TO_EMAIL = "hello@found-places.com";
  process.env.CONTACT_FROM_EMAIL = "FOUND <hello@found-places.com>";

  try {
    const payload = buildContactEmailPayload({
      firstName: "Michelle",
      lastName: "Flores",
      email: "michelle@example.com",
      message: "I found a great business to feature.",
    });

    assert.equal(payload.from, "FOUND <hello@found-places.com>");
    assert.deepEqual(payload.to, ["hello@found-places.com"]);
    assert.equal(payload.reply_to, "michelle@example.com");
    assert.match(payload.subject, /Michelle Flores/);
    assert.match(payload.text, /I found a great business to feature\./);
    assert.match(
      buildContactEmailText({
        firstName: "Michelle",
        lastName: "Flores",
        email: "michelle@example.com",
        message: "I found a great business to feature.",
      }),
      /Name: Michelle Flores/
    );
  } finally {
    restoreEnv("RESEND_API_KEY", previousApiKey);
    restoreEnv("CONTACT_TO_EMAIL", previousTo);
    restoreEnv("CONTACT_FROM_EMAIL", previousFrom);
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
