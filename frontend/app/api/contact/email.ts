const RESEND_SEND_URL = "https://api.resend.com/emails";
const DEFAULT_CONTACT_TO_EMAIL = "hello@found-places.com";
const DEFAULT_CONTACT_FROM_EMAIL = "FOUND <hello@found-places.com>";

type ContactEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

type ContactEmailConfig = {
  resendApiKey: string;
  fromEmail: string;
  toEmail: string;
};

export function getContactEmailConfig(): ContactEmailConfig {
  const resendApiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? DEFAULT_CONTACT_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL ?? DEFAULT_CONTACT_TO_EMAIL;

  if (!resendApiKey) {
    throw new Error("Contact email is not configured.");
  }

  return {
    resendApiKey,
    fromEmail,
    toEmail,
  };
}

export function buildContactEmailText({ firstName, lastName, email, message }: ContactEmailInput) {
  return [
    "New FOUND contact form submission",
    "",
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
  ].join("\n");
}

export function buildContactEmailPayload(input: ContactEmailInput) {
  const config = getContactEmailConfig();

  return {
    from: config.fromEmail,
    to: [config.toEmail],
    reply_to: input.email,
    subject: `New FOUND contact form submission from ${input.firstName} ${input.lastName}`,
    text: buildContactEmailText(input),
  };
}

export async function sendContactEmail(input: ContactEmailInput) {
  const config = getContactEmailConfig();
  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildContactEmailPayload(input)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Email delivery failed.");
  }
}
