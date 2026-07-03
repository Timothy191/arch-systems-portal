import { SetMetadata } from "@nestjs/common";

/**
 * Marks a route as public (no authentication required).
 * Usage: @Public()
 */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
