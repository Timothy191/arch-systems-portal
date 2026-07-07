"use server";

import { updateTag } from "next/cache";
import { CACHE_TAGS } from "./tags";

function updateTags(tags: string[]) {
  for (const tag of tags) updateTag(tag);
}

export async function revalidateMachinesCache() {
  updateTags([CACHE_TAGS.machines]);
}

export async function revalidateSitesCache() {
  updateTags([CACHE_TAGS.sites]);
}

export async function revalidateBadgesCache(deptId?: string) {
  const tags: string[] = [CACHE_TAGS.badges];
  if (deptId) {
    tags.push(`dept:${deptId}`);
  }
  await updateTags(tags);
}

export async function revalidateBreakdownsCache() {
  updateTags([CACHE_TAGS.breakdowns]);
}
