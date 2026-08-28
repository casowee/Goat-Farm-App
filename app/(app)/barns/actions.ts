"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function readBarnFields(formData: FormData) {
  const name = formData.get("name");
  const category = formData.get("category");
  const notes = formData.get("notes");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required." } as const;
  }

  return {
    fields: {
      name: name.trim(),
      category:
        typeof category === "string" && category.trim() ? category.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  } as const;
}

export async function createBarn(
  formData: FormData
): Promise<string | undefined> {
  const parsed = readBarnFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();
  // owner_id is not set here: the column default (auth.uid()) stamps it,
  // and RLS scopes every later read/update/delete to that owner.
  const { error } = await supabase.from("barns").insert(parsed.fields);

  if (error) {
    return "Could not create the barn. Please try again.";
  }

  revalidatePath("/barns");
}

export async function updateBarn(
  id: number,
  formData: FormData
): Promise<string | undefined> {
  const parsed = readBarnFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("barns")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return "Could not update the barn. Please try again.";
  }

  revalidatePath("/barns");
}

export async function deleteBarn(id: number): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.from("barns").delete().eq("id", id);

  if (error) {
    return "Could not delete the barn. Please try again.";
  }

  revalidatePath("/barns");
}
