"use client";

import { ActionForm, SubmitButton, FieldError } from "@/components/forms";
import { subscribeNewsletter } from "@/app/actions/store";
import { cn } from "@/lib/utils";

export function NewsletterForm({ dark }: { dark?: boolean }) {
  return (
    <ActionForm action={subscribeNewsletter} reset refresh={false} className="mt-3">
      <div className={cn("flex gap-2 rounded-full p-1.5", dark ? "bg-card/10" : "bg-card shadow-soft")}>
        <label className="sr-only" htmlFor={dark ? "nl-footer" : "nl-home"}>
          Email
        </label>
        <input
          id={dark ? "nl-footer" : "nl-home"}
          name="email"
          type="email"
          required
          placeholder="Alamat email kamu"
          className={cn("min-w-0 flex-1 bg-transparent px-4 text-sm outline-none", dark ? "text-paper placeholder:text-paper/50" : "placeholder:text-ink-soft")}
        />
        <SubmitButton className={dark ? "btn-lime btn-sm" : "btn-primary btn-sm"}>Daftar</SubmitButton>
      </div>
      <FieldError name="" />
    </ActionForm>
  );
}
