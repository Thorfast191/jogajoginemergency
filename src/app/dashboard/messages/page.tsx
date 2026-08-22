import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MessagesPage() {
  const session = await auth();

  const messages = await prisma.relayMessage.findMany({
    where: { tag: { userId: session!.user.id } },
    include: { tag: { include: { item: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-black/60">
        Messages finders have sent through the relay on your tags. Reply using the contact info
        they left — your own phone number and email were never shown to them.
      </p>

      <ul className="mt-6 space-y-3">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border border-black/10 p-4">
            <div className="flex items-center justify-between text-xs text-black/50">
              <span>{m.tag.item?.label ?? m.tag.publicDisplayName ?? `Tag ${m.tag.shortCode}`}</span>
              <span>{m.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm">{m.message}</p>
            <p className="mt-2 text-xs text-black/50">
              Reply to: <span className="font-medium text-black/70">{m.finderContact}</span>
            </p>
          </li>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-black/50">No messages yet — they&apos;ll show up here when someone scans a tag and reaches out.</p>
        )}
      </ul>
    </div>
  );
}
