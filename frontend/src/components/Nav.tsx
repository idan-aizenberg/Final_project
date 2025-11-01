import { Link, NavLink } from "react-router-dom";

export default function Nav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-200"}`;
  
  return (
    <header className="bg-white border-b">
      <div className="mx-auto max-w-5xl p-4 flex items-center gap-6">
        <Link to="/" className="font-semibold">WeatherSight</Link>
        <nav className="flex gap-2">
          <NavLink to="/" className={linkClass} end>Home</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
        </nav>
      </div>
    </header>
  );
}
