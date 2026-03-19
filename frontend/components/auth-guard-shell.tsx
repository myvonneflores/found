"use client";

import { SiteHeader } from "@/components/site-header";

export function AuthGuardShell() {
  return (
    <main className="page-shell directory-page-shell auth-page-shell dashboard-page-shell">
      <p className="visually-hidden" role="status">Loading...</p>
      <div className="directory-shell">
        <SiteHeader />

        <section className="dashboard-stage">
          <article className="panel dashboard-banner">
            <div className="skeleton skeleton-title" />
            <div className="skeleton-paragraph">
              <span className="skeleton skeleton-text" style={{ width: "90%" }} />
              <span className="skeleton skeleton-text" style={{ width: "70%" }} />
            </div>
          </article>

          <div className="dashboard-column-headings">
            <div className="dashboard-column-heading dashboard-column-heading-favorites">
              <span className="skeleton skeleton-text" style={{ width: "60px" }} />
            </div>
            <div className="dashboard-column-heading dashboard-column-heading-lists">
              <span className="skeleton skeleton-text" style={{ width: "40px" }} />
            </div>
            <div className="dashboard-column-heading dashboard-column-heading-profile">
              <span className="skeleton skeleton-text" style={{ width: "70px" }} />
            </div>
          </div>

          <section className="dashboard-board">
            <article className="panel dashboard-panel dashboard-panel-favorites">
              <div className="skeleton skeleton-row" />
              <div className="skeleton skeleton-row" />
              <div className="skeleton skeleton-row" />
            </article>
            <article className="panel dashboard-panel dashboard-panel-lists">
              <div className="skeleton skeleton-row" />
              <div className="skeleton skeleton-row" />
            </article>
            <aside className="dashboard-sidebar">
              <article className="panel dashboard-panel dashboard-panel-share">
                <div className="skeleton skeleton-input" />
                <div className="skeleton skeleton-input" />
              </article>
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}
