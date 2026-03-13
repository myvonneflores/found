"use client";

import { useState } from "react";

export function ContactForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          message,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "We couldn't send your message just yet.");
      }

      setStatus("success");
      setFeedback("Thanks for reaching out. Your message has been sent.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "We couldn't send your message just yet.");
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-form-grid">
        <label className="contact-field">
          <span className="contact-field-label">First Name</span>
          <input
            autoComplete="given-name"
            name="firstName"
            onChange={(event) => setFirstName(event.target.value)}
            required
            value={firstName}
          />
        </label>

        <label className="contact-field">
          <span className="contact-field-label">Last Name</span>
          <input
            autoComplete="family-name"
            name="lastName"
            onChange={(event) => setLastName(event.target.value)}
            required
            value={lastName}
          />
        </label>
      </div>

      <label className="contact-field">
        <span className="contact-field-label">Email Address</span>
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="contact-field">
        <span className="contact-field-label">Message</span>
        <textarea
          name="message"
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={7}
          value={message}
        />
      </label>

      <button className="contact-submit" disabled={status === "sending"} type="submit">
        {status === "sending" ? "Sending..." : "Send"}
      </button>

      {feedback ? (
        <p className={status === "success" ? "contact-form-note is-success" : "contact-form-note is-error"}>
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
