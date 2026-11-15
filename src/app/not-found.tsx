import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">C & N · Wedding celebration</div>
        <h1 className="serif">This page isn’t on the program</h1>
        <p>We couldn’t find the page you were looking for.</p>
        <Link className="button button-primary invite-submit" href="/">
          <ArrowLeft size={15} /> Back to the invitation
        </Link>
      </section>
    </main>
  );
}
