"use client";

import type { ReactNode } from "react";
import { intFmt } from "../chart-formatters";

export interface TooltipRow {
  color: string;
  label: string;
  value: string | number;
}

export interface TooltipContentProps {
  title?: string;
  rows: TooltipRow[];
  /** Optional additional content (e.g., markers) */
  children?: ReactNode;
}

export function TooltipContent({ title, rows, children }: TooltipContentProps) {
  return (
    <div className="overflow-hidden">
      <div className="bk-tip">
        {title && (
          <div className="bk-tip-title">
            {title}
          </div>
        )}
        <div className="bk-tip-rows">
          {rows.map((row) => (
            <div
              className="bk-tip-row"
              key={`${row.label}-${row.color}`}
            >
              <div className="bk-tip-key">
                <span
                  className="bk-tip-dot"
                  style={{ backgroundColor: row.color }}
                />
                <span className="bk-tip-label">
                  {row.label}
                </span>
              </div>
              <span className="bk-tip-value">
                {typeof row.value === "number" ? intFmt(row.value) : row.value}
              </span>
            </div>
          ))}
        </div>

        {children && (
          <div className="mt-2 transition-opacity duration-200 ease-out">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

TooltipContent.displayName = "TooltipContent";

export default TooltipContent;
