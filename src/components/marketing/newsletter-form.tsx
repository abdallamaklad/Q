"use client";
import { useState } from "react";

/** Newsletter signup — no backend; captures the email and shows a confirmed state. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mono" style={{ color: "var(--brand)", fontSize: 14, letterSpacing: "0.04em" }}>
        ✓ Subscribed — watch your inbox.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
    >
      <input
        type="email"
        placeholder="you@company.com"
        required
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          flex: 1,
          minWidth: 180,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 100,
          padding: "14px 20px",
          color: "var(--white)",
          fontFamily: "var(--font-b)",
          fontSize: 14,
          outline: "none",
        }}
      />
      <button className="btn btn-primary" type="submit">Subscribe</button>
    </form>
  );
}
