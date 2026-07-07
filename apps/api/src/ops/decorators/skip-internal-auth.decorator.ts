import { SetMetadata } from "@nestjs/common";

export const SKIP_INTERNAL_AUTH = "SKIP_INTERNAL_AUTH";
export const SkipInternalAuth = () => SetMetadata(SKIP_INTERNAL_AUTH, true);
