import type OpenAI from "openai";
import { runEventAnalyzer } from "@/lib/thumbnail-studio/event-analyzer";
import { runAudienceAnalyzer } from "@/lib/thumbnail-studio/audience-analyzer";
import { runHookPlanner } from "@/lib/thumbnail-studio/hook-planner";
import { runHookScorer } from "@/lib/thumbnail-studio/hook-scorer";
import { runCompositionPlanner } from "@/lib/thumbnail-studio/composition-planner";
import { runThumbnailPlanner } from "@/lib/thumbnail-studio/thumbnail-planner";
import type {
  PipelineSeed,
  ThumbnailDirectorResult,
} from "@/lib/thumbnail-studio/types";

/**
 * YouTube Thumbnail Director AI.
 * Event → Audience → Hook → Score → Composition → final Image Prompts.
 */
export async function runThumbnailDirectorPipeline(
  openai: OpenAI,
  seed: PipelineSeed
): Promise<ThumbnailDirectorResult> {
  const input: PipelineSeed = {
    caseName: seed.caseName.trim(),
    thumbnailText: seed.thumbnailText.trim(),
    factPack: seed.factPack,
    script: seed.script,
  };
  if (!input.caseName) throw new Error("事件名を入力してください。");

  const event = await runEventAnalyzer(openai, input);
  const audience = await runAudienceAnalyzer(openai, { event });
  const hooks = await runHookPlanner(openai, {
    event,
    audience,
    thumbnailText: input.thumbnailText,
  });
  const scoredHook = await runHookScorer(openai, { event, audience, hooks });
  const composition = await runCompositionPlanner(openai, {
    event,
    audience,
    scoredHook,
  });
  const thumbnail = await runThumbnailPlanner(openai, {
    event,
    audience,
    scoredHook,
    composition,
  });

  return { event, audience, hooks, scoredHook, composition, thumbnail };
}

