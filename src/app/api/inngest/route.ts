/**
 * Inngest serve endpoint — recebe eventos do Inngest Cloud.
 * https://www.inngest.com/docs/sdk/serve
 */
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { allFunctions } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
