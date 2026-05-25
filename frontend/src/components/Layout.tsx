import { Link } from "react-router-dom";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link to="/" className="text-lg font-bold text-white hover:text-blue-400 transition">
          Dialect Coaching
        </Link>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-200 transition">
          Dashboard
        </Link>
        <Link to="/samples" className="text-sm text-gray-400 hover:text-gray-200 transition">
          Samples
        </Link>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
