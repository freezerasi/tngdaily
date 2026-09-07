import { FeedSkeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="px-2 py-3">
      <FeedSkeleton count={2} />
    </div>
  );
}
