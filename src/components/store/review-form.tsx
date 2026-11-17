"use client";

import { useState } from "react";
import { Star } from "@/components/icons";
import { ActionForm, Field, SubmitButton, TextArea } from "@/components/forms";
import { submitReview } from "@/app/actions/store";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  return (
    <ActionForm action={submitReview} reset onDone={() => setRating(0)} className="card space-y-4 p-6">
      <p className="font-bold">Tulis ulasan</p>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} bintang`} onClick={() => setRating(n)}>
            <Star className={cn("h-7 w-7 transition", n <= rating ? "fill-warn text-warn" : "text-ink/20 hover:text-ink/40")} />
          </button>
        ))}
      </div>
      <Field label="Judul (opsional)" name="title" maxLength={80} />
      <TextArea label="Ulasan" name="body" required minLength={10} maxLength={1500} placeholder="Bagaimana ukuran, kualitas, dan kenyamanannya?" />
      <SubmitButton>Kirim ulasan</SubmitButton>
    </ActionForm>
  );
}
