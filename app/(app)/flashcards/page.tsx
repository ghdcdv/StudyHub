import { ApiForm } from "@/components/api-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function FlashcardsPage() {
  const user = await requireUser();
  const decks = await db.flashcardDeck.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { flashcards: true }
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Flashcards
          </p>
          <h2 className="mt-1 text-3xl font-black">Decks saved in Postgres</h2>
        </div>
        {decks.length ? (
          decks.map((deck) => (
            <article key={deck.id} className="panel p-4">
              <h3 className="font-bold">{deck.title}</h3>
              <p className="text-sm text-slate-400">{deck.flashcards.length} cards</p>
            </article>
          ))
        ) : (
          <div className="panel p-6 text-slate-400">
            No flashcard decks yet. Generate one from your own material.
          </div>
        )}
      </section>
      <ApiForm
        endpoint="/api/flashcards"
        submitLabel="Generate deck"
        fields={[
          { name: "title", label: "Deck title", required: true },
          { name: "sourceText", label: "Source material", type: "textarea", required: true },
          { name: "count", label: "Number of cards", type: "number", required: true }
        ]}
      />
    </div>
  );
}
