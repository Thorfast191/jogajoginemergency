import Link from "next/link";
import { MascotSearch } from "@/components/illustrations";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <MascotSearch className="w-28 h-28 text-emerald-600 anim-float" />
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-sm text-black/60">
        The link may be broken or the page may have moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700"
      >
        Go home
      </Link>
    </div>
  );
}
