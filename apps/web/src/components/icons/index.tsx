/**
 * Custom SVG icons adapted from aihive's icon set.
 * These are standalone React components - no IconBase dependency needed.
 */

import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Sidebar collapse/expand toggle icon — rectangle with vertical bar (from aihive Hidden) */
export function SidebarToggleIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="14"
      viewBox="0 0 22.5 19.5"
      className={className}
      style={style}
    >
      <g transform="translate(-2.103 -3.373)" opacity="0.7">
        <rect
          width="10.461"
          height="2.242"
          rx="0.75"
          transform="translate(8.909 7.677) rotate(90)"
          fill="currentColor"
        />
        <rect
          width="21"
          height="18"
          rx="5"
          transform="translate(2.853 4.123)"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

/** Chevron selector vertical — up/down arrows for dropdown trigger (from aihive ChevronSelectorVertical) */
export function ChevronSelectorIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M7 15L12 20L17 15M7 9L12 4L17 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dashboard/Databoard icon - browser with gauge */
export function DataboardIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20.5"
      height="20.5"
      viewBox="0 0 20.5 20.5"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <g transform="translate(-1.75 -1.75)">
        <path d="M2.5,12c0-4.478,0-6.718,1.391-8.109S7.522,2.5,12,2.5s6.718,0,8.109,1.391S21.5,7.522,21.5,12s0,6.718-1.391,8.109S16.478,21.5,12,21.5s-6.718,0-8.109-1.391S2.5,16.478,2.5,12Z" />
        <path d="M2.5,9h19" />
        <path d="M7,6h.009" strokeLinecap="round" />
        <path d="M11,6h.009" strokeLinecap="round" />
        <path d="M17,17A5,5,0,0,0,7,17" />
        <path d="M12.707,15.293l-1.414,1.414" />
      </g>
    </svg>
  );
}

/** AI Model / Sparkle icon */
export function ModelAiIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20.5"
      height="20.5"
      viewBox="0 0 20.5 20.5"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <g transform="translate(-1.75 -1.75)">
        <path d="M9.6,6.112a.967.967,0,0,1,1.8,0l.911,2.309a5.8,5.8,0,0,0,3.268,3.268l2.309.911a.967.967,0,0,1,0,1.8l-2.309.911a5.8,5.8,0,0,0-3.268,3.268L11.4,20.888a.967.967,0,0,1-1.8,0L8.69,18.578A5.8,5.8,0,0,0,5.422,15.31L3.112,14.4a.967.967,0,0,1,0-1.8l2.309-.911A5.8,5.8,0,0,0,8.69,8.422Z" />
        <path d="M18.163,2.73a.363.363,0,0,1,.675,0l.342.866A2.176,2.176,0,0,0,20.4,4.821l.866.342a.363.363,0,0,1,0,.675l-.866.342A2.176,2.176,0,0,0,19.179,7.4l-.342.866a.363.363,0,0,1-.675,0L17.821,7.4A2.176,2.176,0,0,0,16.6,6.179l-.866-.342a.363.363,0,0,1,0-.675l.866-.342A2.176,2.176,0,0,0,17.821,3.6Z" />
      </g>
    </svg>
  );
}

/** Guide / Graduation cap icon (with dark circle background) */
export function GuideIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      style={style}
    >
      <path d="M0 14C0 6.26801 6.26801 0 14 0C21.732 0 28 6.26801 28 14C28 21.732 21.732 28 14 28C6.26801 28 0 21.732 0 14Z" fill="#2E2E2E" />
      <path d="M5.666 10.667C5.666 11.785 12.412 14.833 13.988 14.833C15.564 14.833 22.31 11.785 22.31 10.667C22.31 9.549 15.564 6.5 13.988 6.5C12.412 6.5 5.666 9.549 5.666 10.667Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.994 13.167L9.198 17.858C9.202 17.952 9.213 18.046 9.24 18.136C9.324 18.414 9.479 18.667 9.716 18.837C11.567 20.165 16.407 20.165 18.259 18.837C18.495 18.667 18.65 18.414 18.735 18.136C18.762 18.046 18.772 17.952 18.776 17.858L18.98 13.167" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.06 11.917V17.75M21.06 17.75C20.4 18.955 20.109 19.601 19.812 20.667C19.748 21.046 19.799 21.237 20.06 21.406C20.167 21.475 20.294 21.5 20.421 21.5H21.688C21.822 21.5 21.958 21.472 22.069 21.395C22.312 21.228 22.375 21.044 22.309 20.667C22.049 19.677 21.718 19.001 21.06 17.75Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Video generation / film icon - simple camera */
export function VideoGenIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="12" height="12" rx="3" />
      <path d="M14 8.5L18 6.5V13.5L14 11.5" />
      <circle cx="7" cy="10" r="2" />
    </svg>
  );
}

/** Storage / Cloud icon */
export function StorageIcon({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14H3a3 3 0 0 1 0-6h.5A5.5 5.5 0 0 1 14 6a4 4 0 0 1 3 6.5" />
      <path d="M7 14l3 3 3-3" />
      <path d="M10 14v5" />
    </svg>
  );
}
