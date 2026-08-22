export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-black/60 flex flex-col sm:flex-row justify-between gap-2">
        <p>© {new Date().getFullYear()} Jogajog Emergency. All rights reserved.</p>
        <p>Made for lost bags, bikes, and everything in between.</p>
      </div>
    </footer>
  );
}
