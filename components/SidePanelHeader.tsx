"use client";

import type { ReactNode } from "react";

export type SidePanelHeaderProps = {
  title: string;
  meta?: string;
  actions?: ReactNode;
};

export function SidePanelHeader({
  title,
  meta,
  actions,
}: SidePanelHeaderProps) {
  return (
    <header className="vt-panel-header vt-chrome">
      <div className="vt-panel-header__main">
        <h2 className="vt-title">{title}</h2>
        {meta ? <span className="vt-meta truncate">{meta}</span> : null}
      </div>
      {actions ? (
        <div className="vt-panel-header__actions">{actions}</div>
      ) : null}
    </header>
  );
}
