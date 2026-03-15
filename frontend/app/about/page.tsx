import Link from "next/link";

import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

export default function AboutPage() {
  return (
    <main className="page-shell directory-page-shell about-page-shell">
      <BodyClass className="about-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/about" />
        <section className="about-layout">
          <div className="about-intro-card">
            <div className="about-hero">
              <h1 className="about-title">About Us</h1>
              <p className="about-tagline">Helping people discover locally owned businesses</p>
            </div>
          </div>

          <div className="about-section">
            <div className="about-pill">why we built found</div>
            <article className="about-card">
              <p className="lede">
                FOUND started with a simple problem: it&apos;s surprisingly hard to discover locally owned businesses
                in a meaningful way. Search engines surface the same big box stores and chain restaurants, while the
                independent shops, restaurants, and services that give a place its character are often harder to find.
              </p>
              <p className="lede">
                Exclusively for locally owned businesses, FOUND was created to make those businesses easier to
                discover. By organizing information about ownership, products, and business practices, we help people
                find and support the kinds of businesses they care about.
              </p>
            </article>
          </div>

          <div className="about-section">
            <div className="about-pill">how found works</div>
            <article className="about-card">
              <p className="lede">
                FOUND organizes locally owned businesses in a searchable directory that makes it easy to filter by what
                matters to you. Instead of scrolling through long lists, you can quickly narrow your search by city,
                business category, ownership, and other characteristics like locally made goods or sustainable
                products.
              </p>
              <p className="lede">
                Save the spots you love, build a list for your next trip, and share your recommendations with your
                community.
              </p>
              <p className="lede">
                The goal is simple: help people discover great local businesses and make it easier for those businesses
                to connect with the people looking for them.
              </p>
            </article>
          </div>

          <div className="about-section">
            <article className="about-card about-cta-card">
              <div className="about-cta-copy">
                <h2 className="about-cta-title">Know a business we should feature?</h2>
                <p className="lede">
                  Recommend a locally owned business for FOUND and help more people discover great spots in their
                  community.
                </p>
              </div>
              <Link className="about-cta-link" href="/contact">
                Recommend a business
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
