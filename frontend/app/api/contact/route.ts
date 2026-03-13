import { NextResponse } from "next/server";

const HUBSPOT_PORTAL_ID = "47665661";
const HUBSPOT_FORM_ID = "8bbf93f5-2478-4957-8094-7e3b7df8a8ca";
const HUBSPOT_SUBMIT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`;

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, message } = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      message?: string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const hubspotResponse = await fetch(HUBSPOT_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [
          { name: "firstname", value: firstName.trim() },
          { name: "lastname", value: lastName.trim() },
          { name: "email", value: email.trim() },
          { name: "message", value: message.trim() },
        ],
      }),
    });

    if (!hubspotResponse.ok) {
      const errorText = await hubspotResponse.text();
      return NextResponse.json({ error: errorText || "HubSpot submission failed." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong while sending your message." }, { status: 500 });
  }
}
