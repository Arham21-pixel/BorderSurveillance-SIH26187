import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/cameras", label: "Cameras" },
  { to: "/alerts", label: "Alerts" },
  { to: "/events", label: "Events" },
  { to: "/analytics", label: "Analytics" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        BORDER AI SENTINEL
        <small>SIH 26187 · operator console</small>
      </div>
      <nav className="nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
