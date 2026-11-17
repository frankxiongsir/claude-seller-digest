import { ArchiveApp } from "@/components/archive-app";
import snapshotJson from "@/data/snapshot.json";
import type { Snapshot } from "@/lib/types";

const snapshot = snapshotJson as Snapshot;

export default function HomePage() {
  return (
    <main>
      <p className="sr-only" data-post-count={snapshot.posts.length}>
        共 {snapshot.posts.length} 条
      </p>
      <ArchiveApp snapshot={snapshot} />
    </main>
  );
}
