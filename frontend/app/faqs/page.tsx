"use client";
import { useState } from "react";

import Link from "next/link";

import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

const faqItems = [
  {
    question: "How does FOUND work?",
    answer:
      "FOUND organizes curated business data into a searchable directory. You can filter by city, category, ownership, sustainability focus, and more before saving favorites or building shareable lists.",
  },
  {
    question: "Who is FOUND for?",
    answer:
      "Everyone. Personal accounts save favorites and lists for private reference or sharing. Business accounts claim their profile, update their details, and keep a published presence for customers and collaborators.",
  },
  {
    question: "How much does FOUND cost?",
    answer:
      "FOUND is free for anyone to browse. Free personal and business accounts unlock favorites, lists, and claim tools, with optional upgrades rolling out later for additional publishing or promotional features.",
  },
  {
    question: "How do I claim my business?",
    answer:
      "Sign in with a business account then submit your claim. We'll verify your claim and in the meantime, you can start saving your favorites and building lists to share with your community.",
  },
  {
    question: "Can I keep my profile or lists private?",
    answer:
      "Yes. Each profile and list has a visibility toggle. Private content stays tied to your account and won’t appear in search results until you choose to publish it.",
  },
];

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <main className="page-shell directory-page-shell about-page-shell">
      <BodyClass className="about-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/faqs" />

        <section className="about-layout">
          <div className="about-intro-card">
            <div className="about-hero">
              <h1 className="about-title">FAQs</h1>
              <p className="about-tagline">Quick answers about how FOUND works and how you manage your profile.</p>
            </div>
          </div>

          <div className="faq-panel">
            {faqItems.map((item, index) => {
              const isOpen = index === openIndex;
              return (
                <div key={item.question}>
                  <article className="faq-strip">
                    <button
                      type="button"
                      className="faq-strip-header"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span>{item.question}</span>
                      <span aria-hidden="true" className="faq-strip-toggle">
                        {isOpen ? "−" : "›"}
                      </span>
                    </button>
                  </article>
                  {isOpen ? (
                    <article className="faq-answer-strip">
                      <p className="faq-strip-answer">{item.answer}</p>
                    </article>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="about-section">
            <article className="about-card about-cta-card">
              <div className="about-cta-copy">
                <h2 className="about-cta-title">Still have questions?</h2>
                <p className="lede">Reach out directly and we’ll help you navigate FOUND and your profile.</p>
              </div>
              <Link className="about-cta-link" href="/contact">
                Contact Us
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
