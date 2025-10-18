// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from "@t3-oss/env-nextjs";

export const clientEnv = createEnv({
  client: {},
  runtimeEnv: {},
});
