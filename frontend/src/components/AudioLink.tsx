import { Link } from "react-router-dom";

interface AudioLinkProps {
  audioResourceId: number;
  label?: string;
  className?: string;
}

export default function AudioLink({ audioResourceId, label, className }: AudioLinkProps) {
  return (
    <Link
      to={`/audio/${audioResourceId}`}
      className={className || "inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition"}
      title="Open in Audio Workspace"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label || "Open Audio"}
    </Link>
  );
}
