export default function AdminPage() {
  return (
    <main className="admin-page">
      <section className="admin-card">
        <h1>Lodestar CV Admin</h1>
        <p>
          Connect Supabase and visit <code>/api/orders?key=YOUR_ADMIN_KEY</code> to view recent submissions as JSON.
        </p>
        <div className="admin-note">
          This lightweight admin view is intentionally minimal so the MVP stays focused on capture, preview, checkout, and delivery.
        </div>
      </section>
    </main>
  );
}
