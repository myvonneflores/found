import { NextResponse } from "next/server";

import { sendContactEmail } from "./email";
import { isAllowedContactSubmissionOrigin } from "./origin";

const MIN_FORM_FILL_MS = 1500;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 12;

export const runtime = "nodejs";

type ContactSubmissionPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
  website?: string;
  submittedAt?: number;
};

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");

    if (!isAllowedContactSubmissionOrigin(request, origin)) {
      return NextResponse.json({ error: "Invalid submission origin." }, { status: 403 });
    }

    const { firstName, lastName, email, message, website, submittedAt } =
      (await request.json()) as ContactSubmissionPayload;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (website?.trim()) {
      return NextResponse.json({ ok: true });
    }

    if (!submittedAt || !Number.isFinite(submittedAt)) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    const elapsedMs = Date.now() - submittedAt;
    if (elapsedMs < MIN_FORM_FILL_MS || elapsedMs > MAX_FORM_AGE_MS) {
      return NextResponse.json({ error: "Invalid submission timing." }, { status: 400 });
    }

    try {
      await sendContactEmail({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        message: message.trim(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Contact email is not configured.") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Email delivery failed." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong while sending your message." }, { status: 500 });
  }
}
