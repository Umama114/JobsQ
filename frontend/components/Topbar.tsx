import type { ReactNode } from "react";

export default function Topbar({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="grow">
        <h1 className="h2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
        {sub && <div className="caption">{sub}</div>}
      </div>
      {children}
    </header>
  );
}
