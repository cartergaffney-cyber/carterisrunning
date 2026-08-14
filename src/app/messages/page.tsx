import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DismissNoteButton } from "@/components/messages/DismissNoteButton";
import { HelpfulFeedback } from "@/components/ui/HelpfulFeedback";

const KIND_LABELS: Record<string, string> = {
  PLAN_RECALIBRATED_FASTER: "Plan sped up",
  PLAN_RECALIBRATED_SLOWER: "Plan eased back",
};

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notes = await prisma.coachNote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[clamp(26px,4vw,32px)]">Messages</h1>
        <p className="text-sm text-muted-foreground">
          A running record of updates and plan changes from your coach.
        </p>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet — your coach will note anything here when your plan adjusts based on how your training is going.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={note.dismissedAt ? "neutral" : "accent"}>{note.dismissedAt ? "Read" : "New"}</Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    {KIND_LABELS[note.kind] ?? note.kind}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {note.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                </div>
                {!note.dismissedAt && <DismissNoteButton id={note.id} />}
              </div>
              <p className="text-sm">{note.message}</p>
              <HelpfulFeedback
                endpoint={`/api/coach-notes/${note.id}/feedback`}
                initialHelpful={note.helpful}
                label="Was this note helpful?"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
