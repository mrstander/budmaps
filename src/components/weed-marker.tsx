import { cn } from "@/lib/utils";

const WeedMarker = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("w-8 h-8", className)}
  >
    <path d="M12.38,2.25A1.13,1.13,0,0,0,12,2.22a1.12,1.12,0,0,0-.38.08C5.11,4.52,2.35,8.19,2.35,11.83a1,1,0,0,0,1,1H5.78a.14.14,0,0,1,.14.14v5.42a.79.79,0,0,0,.79.79H8.06a1.13,1.13,0,0,0,1.13-1.13V15.58h5.62v2.47a1.13,1.13,0,0,0,1.13,1.13h1.35a.79.79,0,0,0,.79-.79V12.92a.14.14,0,0,1,.14-.14h2.42a1,1,0,0,0,1-1C21.65,8.19,18.89,4.52,12.38,2.25Z" />
  </svg>
);

export default WeedMarker;
