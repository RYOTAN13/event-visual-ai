"use client";

import { useEffect, useRef, useState } from "react";
import type { CinematicStylePreset } from "@/lib/cinematic-director";
import {
  CINEMATIC_STYLE_PRESETS,
  DEFAULT_CINEMATIC_STYLE,
} from "@/lib/cinematic-director";
import {
  DEFAULT_SCENE_COUNT,
  parseSceneCount,
  SCENE_COUNT_OPTIONS,
  type SceneCount,
} from "@/lib/utils/scene-count";
import type { CameraDirector } from "@/lib/camera-director";
import type { CharacterBible, FactPack, Scene, SceneWithImage } from "@/lib/types";
import {
  countDownloadableScenes,
  downloadScenesAsZip,
} from "@/lib/utils/download-scenes-zip";
import {
  applySceneSnapshot,
  buildEnrichedSceneForPrompt,
  ensureOriginalSnapshot,
  getSceneFieldDisplayValue,
  isSceneEdited,
  parseSceneFieldValue,
  SCENE_EDITABLE_FIELD_LABELS,
  type SceneEditableFieldKey,
} from "@/lib/utils/scene-editor";
import {
  createEmptySceneFromTemplate,
  duplicateScene,
  generateTimelineId,
  moveSceneDown,
  moveSceneUp,
  normalizeScenes,
  removeSceneAt,
} from "@/lib/utils/timeline-editor";
import {
  loadProject,
  saveProject,
  type StoredProject,
} from "@/lib/storage/project-storage";
import { SceneEditableField } from "@/app/components/SceneEditableField";
import { CharacterStudioPanel } from "@/app/components/CharacterStudioPanel";
import {
  buildEffectiveCharacterPrompt,
  normalizeCharacterStudio,
  resolveEffectiveCharacterBible,
} from "@/lib/character-studio";
import {
  DEFAULT_CHARACTER_STUDIO,
  type CharacterStudio,
} from "@/lib/types/character-studio";
import styles from "./page.module.css";

type ScriptStatus = "idle" | "generating" | "ready";
type LoadingPhase =
  | "idle"
  | "fact-pack"
  | "script"
  | "scenes"
  | "cinematic"
  | "camera"
  | "prompts"
  | "master"
  | "images";
type RegenerateMode = "normal" | "with-instruction" | "image-only";

type SceneFieldEdit = {
  sceneNumber: string;
  field: SceneEditableFieldKey;
  draft: string;
};

const SCENE_EDITABLE_FIELDS: SceneEditableFieldKey[] = [
  "narration",
  "imageDescription",
  "visualPurpose",
  "emotion",
  "charactersInScene",
  "additionalInstruction",
];

function toSceneWithImage(
  scene: Scene,
  characterBible: CharacterBible | null = null,
  cinematicStyle: CinematicStylePreset = DEFAULT_CINEMATIC_STYLE
): SceneWithImage {
  const base: SceneWithImage = {
    ...scene,
    timelineId: generateTimelineId(),
    characterBible,
    masterDirectorPrompt: null,
    cinematicDirectorPrompt: null,
    cinematicStyle,
    cameraDirector: null,
    cameraDirectorPrompt: null,
    visualDirectorScenePrompt: null,
    visualDirectorPrompt: null,
    visualDirectorError: null,
    characterBiblePrompt: null,
    additionalInstruction: "",
    imageUrl: null,
    imageError: null,
    imageLoading: false,
    variantsLoading: false,
    variants: null,
    variantError: null,
    adoptedVariantIndex: null,
  };
  return ensureOriginalSnapshot(base);
}

export default function Home() {
  const [eventName, setEventName] = useState("");
  const [cinematicStyle, setCinematicStyle] =
    useState<CinematicStylePreset>(DEFAULT_CINEMATIC_STYLE);
  const [sceneCount, setSceneCount] = useState<SceneCount>(DEFAULT_SCENE_COUNT);
  const [scenes, setScenes] = useState<SceneWithImage[]>([]);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");

  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>("idle");
  const [scriptTitle, setScriptTitle] = useState("");
  const [script, setScript] = useState("");
  const [editedScript, setEditedScript] = useState("");
  const [scriptCharCount, setScriptCharCount] = useState(0);
  const [factPack, setFactPack] = useState<FactPack | null>(null);
  const [characterStudio, setCharacterStudio] = useState<CharacterStudio>(
    DEFAULT_CHARACTER_STUDIO
  );

  const loading = loadingPhase !== "idle";
  const [regeneratingScenes, setRegeneratingScenes] = useState<
    Map<string, RegenerateMode>
  >(new Map());
  const [zipDownloading, setZipDownloading] = useState(false);
  const [zipError, setZipError] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fieldEdit, setFieldEdit] = useState<SceneFieldEdit | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(message: string, tone: "success" | "error" = "success") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  function handleSaveProject() {
    const project: StoredProject = {
      version: 1,
      savedAt: new Date().toISOString(),
      eventName,
      cinematicStyle,
      sceneCount,
      factPack,
      scriptTitle,
      script,
      editedScript,
      scriptCharCount,
      characterStudio,
      scenes: scenes.map((scene) => ({
        ...scene,
        imageLoading: false,
        variantsLoading: false,
      })),
    };

    const result = saveProject(project);
    if (result.ok) {
      showToast("保存しました");
    } else {
      showToast(result.error, "error");
    }
  }

  function handleLoadProject() {
    const result = loadProject();
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    const project = result.project;

    setEventName(project.eventName);
    setCinematicStyle(project.cinematicStyle);
    setSceneCount(project.sceneCount);
    setFactPack(project.factPack);
    setScriptTitle(project.scriptTitle);
    setScript(project.script);
    setEditedScript(project.editedScript);
    setScriptCharCount(project.scriptCharCount);
    setCharacterStudio(normalizeCharacterStudio(project.characterStudio));
    setScenes(
      normalizeScenes(
        project.scenes.map((scene) =>
          ensureOriginalSnapshot({
            ...scene,
            imageLoading: false,
            variantsLoading: false,
          })
        )
      )
    );
    setFieldEdit(null);
    setScriptStatus(project.script ? "ready" : "idle");
    setLoadingPhase("idle");
    setError("");
    setZipError("");
    setRegeneratingScenes(new Map());

    showToast("読込完了");
  }

  const activeScript = editedScript || script;
  const isScriptEdited = editedScript !== "" && editedScript !== script;

  function getEffectiveCharacterBible(scene: SceneWithImage | undefined) {
    return resolveEffectiveCharacterBible(
      characterStudio.protagonist,
      scene?.characterBible ?? null
    );
  }

  function getCharacterPromptForScene(scene: SceneWithImage): string | null {
    return buildEffectiveCharacterPrompt(
      characterStudio.protagonist,
      scene.sceneAge,
      scene.characterBible,
      scene.characterBiblePrompt
    );
  }

  function updateProtagonist(
    protagonist: CharacterStudio["protagonist"]
  ) {
    setCharacterStudio({ protagonist });
  }

  function updateScene(
    sceneNumber: string,
    patch: Partial<SceneWithImage>
  ) {
    setScenes((prev) =>
      prev.map((scene) =>
        scene.sceneNumber === sceneNumber ? { ...scene, ...patch } : scene
      )
    );
  }

  function startSceneFieldEdit(sceneNumber: string, field: SceneEditableFieldKey) {
    const scene = scenes.find((item) => item.sceneNumber === sceneNumber);
    if (!scene) return;

    setFieldEdit({
      sceneNumber,
      field,
      draft: getSceneFieldDisplayValue(scene, field),
    });
  }

  function saveSceneFieldEdit(field: SceneEditableFieldKey) {
    if (!fieldEdit || fieldEdit.field !== field) return;

    const patch = parseSceneFieldValue(fieldEdit.field, fieldEdit.draft);
    updateScene(fieldEdit.sceneNumber, patch);
    setFieldEdit(null);
  }

  function handleRevertScene(sceneNumber: string) {
    const scene = scenes.find((item) => item.sceneNumber === sceneNumber);
    if (!scene?.originalSnapshot) return;

    updateScene(sceneNumber, applySceneSnapshot(scene, scene.originalSnapshot));

    if (fieldEdit?.sceneNumber === sceneNumber) {
      setFieldEdit(null);
    }
  }

  function isFieldEditing(sceneNumber: string, field: SceneEditableFieldKey) {
    return (
      fieldEdit?.sceneNumber === sceneNumber && fieldEdit.field === field
    );
  }

  function applyTimelineUpdate(updater: (scenes: SceneWithImage[]) => SceneWithImage[]) {
    setScenes((prev) => normalizeScenes(updater(prev)));
    setFieldEdit(null);
    setRegeneratingScenes(new Map());
  }

  function handleMoveSceneUp(index: number) {
    applyTimelineUpdate((prev) => moveSceneUp(prev, index));
  }

  function handleMoveSceneDown(index: number) {
    applyTimelineUpdate((prev) => moveSceneDown(prev, index));
  }

  function handleDuplicateScene(index: number) {
    applyTimelineUpdate((prev) => {
      const copy = duplicateScene(prev[index]);
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function handleDeleteScene(index: number, sceneNumber: string) {
    const confirmed = window.confirm(
      `Scene ${sceneNumber} を削除しますか？\nこの操作は取り消せません。`
    );
    if (!confirmed) return;

    applyTimelineUpdate((prev) => removeSceneAt(prev, index));
  }

  function handleAddSceneAfter(index: number) {
    applyTimelineUpdate((prev) => {
      const template = prev[index] ?? prev[0];
      if (!template) return prev;
      const empty = createEmptySceneFromTemplate(template);
      const next = [...prev];
      next.splice(index + 1, 0, empty);
      return next;
    });
  }

  function setSceneRegenerating(
    sceneNumber: string,
    mode: RegenerateMode | null
  ) {
    setRegeneratingScenes((prev) => {
      const next = new Map(prev);
      if (mode) {
        next.set(sceneNumber, mode);
      } else {
        next.delete(sceneNumber);
      }
      return next;
    });
  }

  async function regenerateSceneImage(
    sceneNumber: string,
    mode: RegenerateMode
  ) {
    const scene = scenes.find((item) => item.sceneNumber === sceneNumber);
    if (!scene) return;

    const previousImageUrl = scene.imageUrl;
    const isImageOnly = mode === "image-only";

    setSceneRegenerating(sceneNumber, mode);
    updateScene(sceneNumber, {
      imageLoading: true,
      imageError: null,
      imageUrl: isImageOnly ? previousImageUrl : null,
    });

    const sceneForGeneration = isImageOnly
      ? scene
      : await prepareSceneForImageGeneration(scene);

    const result = await generateImageForScene(
      sceneForGeneration,
      mode === "with-instruction"
    );

    updateScene(sceneNumber, {
      imageUrl: result.imageUrl ?? previousImageUrl,
      imageError: result.imageError,
      imageLoading: false,
      adoptedVariantIndex: result.imageUrl ? null : scene.adoptedVariantIndex,
    });
    setSceneRegenerating(sceneNumber, null);
  }

  async function handleGenerateImageOnly(sceneNumber: string) {
    await regenerateSceneImage(sceneNumber, "image-only");
  }

  async function handleRegenerateImage(sceneNumber: string) {
    await regenerateSceneImage(sceneNumber, "normal");
  }

  async function handleRegenerateWithInstruction(sceneNumber: string) {
    const scene = scenes.find((item) => item.sceneNumber === sceneNumber);
    if (!scene?.additionalInstruction.trim()) {
      updateScene(sceneNumber, {
        imageError: "追加指示を入力してください。",
      });
      return;
    }
    await regenerateSceneImage(sceneNumber, "with-instruction");
  }

  function handleAdoptVariant(sceneNumber: string, index: number) {
    const scene = scenes.find((item) => item.sceneNumber === sceneNumber);
    const variant = scene?.variants?.[index];
    if (!variant?.imageUrl) return;

    updateScene(sceneNumber, {
      imageUrl: variant.imageUrl,
      adoptedVariantIndex: index,
      imageError: null,
    });
  }

  function handleDownloadImage(scene: SceneWithImage) {
    if (!scene.imageUrl) return;

    const safeName = scene.sceneNumber.replace(/\s+/g, "_").toLowerCase();
    const link = document.createElement("a");
    link.href = scene.imageUrl;
    link.download = `${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function buildZipFilename(): string {
    const safe =
      eventName
        .trim()
        .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "scenes";
    return `${safe}.zip`;
  }

  async function handleDownloadAllZip() {
    setZipError("");
    setZipDownloading(true);

    try {
      await downloadScenesAsZip(
        scenes.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          imageUrl: scene.imageUrl ?? "",
        })),
        buildZipFilename()
      );
    } catch (err) {
      setZipError(
        err instanceof Error ? err.message : "ZIPのダウンロードに失敗しました。"
      );
    } finally {
      setZipDownloading(false);
    }
  }

  const downloadableSceneCount = countDownloadableScenes(
    scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      imageUrl: scene.imageUrl ?? "",
    }))
  );

  async function generateCinematicDirection(
    scenesToProcess: SceneWithImage[],
    currentEventName: string,
    style: CinematicStylePreset
  ): Promise<string> {
    setLoadingPhase("cinematic");
    setProgress({ current: 0, total: 1 });

    const response = await fetch("/api/generate-cinematic-direction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: currentEventName,
        cinematicStyle: style,
        characterBible: getEffectiveCharacterBible(scenesToProcess[0]),
        sceneCount: scenesToProcess.length,
        scenes: scenesToProcess.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          narration: scene.narration,
          imageDescription: scene.imageDescription,
          sceneAge: scene.sceneAge,
          charactersInScene: scene.charactersInScene,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Cinematic Directorの設計に失敗しました。"
      );
    }

    setProgress({ current: 1, total: 1 });
    return data.cinematicDirectorPrompt as string;
  }

  async function generateCameraDirection(
    scenesToProcess: SceneWithImage[],
    currentEventName: string,
    cinematicDirectorPrompt: string
  ): Promise<SceneWithImage[]> {
    setLoadingPhase("camera");
    setProgress({ current: 0, total: 1 });

    const response = await fetch("/api/generate-camera-direction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: currentEventName,
        characterBible: getEffectiveCharacterBible(scenesToProcess[0]),
        sceneCount: scenesToProcess.length,
        cinematicDirectorPrompt,
        scenes: scenesToProcess.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          narration: scene.narration,
          imageDescription: scene.imageDescription,
          sceneAge: scene.sceneAge,
          charactersInScene: scene.charactersInScene,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Camera Directorの設計に失敗しました。");
    }

    type CameraSceneResult = CameraDirector & { cameraDirectorPrompt: string };

    const cameraMap = new Map<string, CameraSceneResult>(
      (data.scenes as CameraSceneResult[]).map((item) => [
        item.sceneNumber,
        item,
      ])
    );

    const updatedScenes = scenesToProcess.map((scene) => {
      const camera = cameraMap.get(scene.sceneNumber);
      return {
        ...scene,
        cinematicDirectorPrompt,
        cameraDirector: camera
          ? {
              sceneNumber: camera.sceneNumber,
              shotType: camera.shotType,
              cameraHeight: camera.cameraHeight,
              lens: camera.lens,
              distance: camera.distance,
              framing: camera.framing,
              composition: camera.composition,
              focus: camera.focus,
              depthOfField: camera.depthOfField,
              lightingDirection: camera.lightingDirection,
              perspective: camera.perspective,
              cutRationale: camera.cutRationale,
            }
          : null,
        cameraDirectorPrompt: camera?.cameraDirectorPrompt ?? null,
      };
    });

    setScenes(updatedScenes);
    setProgress({ current: 1, total: 1 });
    return updatedScenes;
  }

  async function generateVisualDirection(
    scenesToProcess: SceneWithImage[],
    currentEventName: string,
    cinematicDirectorPrompt: string
  ): Promise<SceneWithImage[]> {
    setLoadingPhase("prompts");
    const total = scenesToProcess.length;
    setProgress({ current: 0, total });

    let updatedScenes: SceneWithImage[] = scenesToProcess.map((scene) => ({
      ...scene,
      cinematicDirectorPrompt,
      cinematicStyle,
      visualDirectorScenePrompt: null as string | null,
      visualDirectorPrompt: null as string | null,
      visualDirectorError: null as string | null,
    }));

    for (let i = 0; i < updatedScenes.length; i++) {
      const scene = updatedScenes[i];

      try {
        const response = await fetch("/api/generate-visual-direction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: currentEventName,
            characterBible: getEffectiveCharacterBible(scene),
            cinematicDirectorPrompt,
            scenes: [
              {
                sceneNumber: scene.sceneNumber,
                narration: scene.narration,
                imageDescription: scene.imageDescription,
                sceneAge: scene.sceneAge,
                charactersInScene: scene.charactersInScene,
                cameraDirectorPrompt: scene.cameraDirectorPrompt ?? "",
              },
            ],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          updatedScenes[i] = {
            ...updatedScenes[i],
            visualDirectorError:
              data.error || "Visual Director AIの設計に失敗しました。",
          };
        } else {
          const result = data.scenes[0] as
            | { visualDirectorScenePrompt: string }
            | undefined;

          updatedScenes[i] = {
            ...updatedScenes[i],
            visualDirectorScenePrompt: result?.visualDirectorScenePrompt ?? null,
            characterBiblePrompt:
              data.characterBiblePrompt ?? updatedScenes[i].characterBiblePrompt,
            visualDirectorError: result?.visualDirectorScenePrompt
              ? null
              : "Visual Director Promptが見つかりませんでした。",
          };
        }
      } catch (err) {
        updatedScenes[i] = {
          ...updatedScenes[i],
          visualDirectorError:
            err instanceof Error
              ? err.message
              : "Visual Director AIの設計に失敗しました。",
        };
      }

      setScenes([...updatedScenes]);
      setProgress({ current: i + 1, total });
    }

    return updatedScenes;
  }

  async function generateMasterDirection(
    scenesToProcess: SceneWithImage[],
    currentEventName: string,
    cinematicDirectorPrompt: string
  ): Promise<SceneWithImage[]> {
    const readyScenes = scenesToProcess.filter(
      (scene) => scene.visualDirectorScenePrompt?.trim()
    );

    if (readyScenes.length === 0) {
      return scenesToProcess;
    }

    setLoadingPhase("master");
    setProgress({ current: 0, total: 1 });

    const response = await fetch("/api/generate-master-direction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: currentEventName,
        characterBible: getEffectiveCharacterBible(scenesToProcess[0]),
        cinematicDirectorPrompt,
        scenes: readyScenes.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          narration: scene.narration,
          imageDescription: scene.imageDescription,
          sceneAge: scene.sceneAge,
          charactersInScene: scene.charactersInScene,
          cameraDirectorPrompt: scene.cameraDirectorPrompt ?? "",
          visualDirectorScenePrompt: scene.visualDirectorScenePrompt ?? "",
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.error || "Master Directorのレビューに失敗しました。";
      const failedScenes = scenesToProcess.map((scene) => ({
        ...scene,
        visualDirectorError: scene.visualDirectorScenePrompt
          ? message
          : scene.visualDirectorError,
      }));
      setScenes(failedScenes);
      return failedScenes;
    }

    const masterMap = new Map<
      string,
      { visualDirectorPrompt: string; visualDirectorScenePrompt: string }
    >(
      data.scenes.map(
        (item: {
          sceneNumber: string;
          visualDirectorPrompt: string;
          visualDirectorScenePrompt: string;
        }) => [item.sceneNumber, item]
      )
    );

    const updatedScenes = scenesToProcess.map((scene) => {
      const mastered = masterMap.get(scene.sceneNumber);
      if (!mastered) {
        return scene;
      }

      return {
        ...scene,
        masterDirectorPrompt: data.masterDirectorPrompt ?? null,
        characterBiblePrompt:
          data.characterBiblePrompt ?? scene.characterBiblePrompt,
        visualDirectorScenePrompt: mastered.visualDirectorScenePrompt,
        visualDirectorPrompt: mastered.visualDirectorPrompt,
        visualDirectorError: null,
      };
    });

    setScenes(updatedScenes);
    setProgress({ current: 1, total: 1 });
    return updatedScenes;
  }

  async function refreshScenePrompts(
    scene: SceneWithImage
  ): Promise<Partial<SceneWithImage> | null> {
    const currentEventName = eventName.trim();
    const effectiveBible = getEffectiveCharacterBible(scene);
    if (
      !currentEventName ||
      !effectiveBible ||
      !scene.cinematicDirectorPrompt ||
      !scene.cameraDirectorPrompt
    ) {
      return null;
    }

    const enrichedScene = buildEnrichedSceneForPrompt(scene);

    const visualResponse = await fetch("/api/generate-visual-direction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: currentEventName,
        characterBible: effectiveBible,
        cinematicDirectorPrompt: scene.cinematicDirectorPrompt,
        scenes: [enrichedScene],
      }),
    });

    const visualData = await visualResponse.json();

    if (!visualResponse.ok) {
      return {
        visualDirectorError:
          visualData.error || "Visual Director Promptの再生成に失敗しました。",
      };
    }

    const visualScene = visualData.scenes?.[0];
    if (!visualScene?.visualDirectorScenePrompt) {
      return {
        visualDirectorError: "Visual Director Promptの再生成に失敗しました。",
      };
    }

    const masterResponse = await fetch("/api/generate-master-direction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: currentEventName,
        characterBible: effectiveBible,
        cinematicDirectorPrompt: scene.cinematicDirectorPrompt,
        scenes: [
          {
            ...enrichedScene,
            visualDirectorScenePrompt: visualScene.visualDirectorScenePrompt,
          },
        ],
      }),
    });

    const masterData = await masterResponse.json();

    if (!masterResponse.ok) {
      return {
        visualDirectorScenePrompt: visualScene.visualDirectorScenePrompt,
        visualDirectorError:
          masterData.error || "Master Director Promptの再生成に失敗しました。",
      };
    }

    const masterScene = masterData.scenes?.[0];
    const updatedScene = {
      ...scene,
      visualDirectorScenePrompt: visualScene.visualDirectorScenePrompt,
      visualDirectorPrompt:
        masterScene?.visualDirectorPrompt ?? visualScene.visualDirectorScenePrompt,
      masterDirectorPrompt: masterData.masterDirectorPrompt ?? scene.masterDirectorPrompt,
    };

    return {
      visualDirectorScenePrompt: visualScene.visualDirectorScenePrompt,
      visualDirectorPrompt: updatedScene.visualDirectorPrompt,
      characterBiblePrompt:
        getCharacterPromptForScene(updatedScene) ??
        masterData.characterBiblePrompt ??
        scene.characterBiblePrompt,
      masterDirectorPrompt: updatedScene.masterDirectorPrompt,
      visualDirectorError: null,
    };
  }

  async function prepareSceneForImageGeneration(
    scene: SceneWithImage
  ): Promise<SceneWithImage> {
    const promptPatch = await refreshScenePrompts(scene);
    if (!promptPatch) {
      return scene;
    }

    const updatedScene = { ...scene, ...promptPatch };
    updateScene(scene.sceneNumber, promptPatch);
    return updatedScene;
  }

  async function generateImageForScene(
    scene: SceneWithImage,
    withAdditionalInstruction = false
  ): Promise<{ imageUrl: string | null; imageError: string | null }> {
    if (!scene.visualDirectorPrompt) {
      return {
        imageUrl: null,
        imageError:
          scene.visualDirectorError ||
          "Visual Director Promptが未生成のため、画像を生成できません。",
      };
    }

    try {
      let prompt = scene.visualDirectorPrompt;
      const characterPrompt = getCharacterPromptForScene(scene);

      if (withAdditionalInstruction) {
        const instruction = scene.additionalInstruction.trim();
        if (!instruction) {
          return {
            imageUrl: null,
            imageError: "追加指示を入力してください。",
          };
        }

        const integrateResponse = await fetch("/api/integrate-instruction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visualDirectorPrompt: scene.visualDirectorPrompt,
            characterBiblePrompt: characterPrompt,
            additionalInstruction: instruction,
          }),
        });

        const integrateData = await integrateResponse.json();

        if (!integrateResponse.ok) {
          return {
            imageUrl: null,
            imageError:
              integrateData.error || "プロンプトの統合に失敗しました。",
          };
        }

        prompt = integrateData.integratedPrompt;
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          characterBiblePrompt: characterPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          imageUrl: null,
          imageError: data.error || "画像の生成に失敗しました。",
        };
      }

      return { imageUrl: data.imageUrl, imageError: null };
    } catch (err) {
      return {
        imageUrl: null,
        imageError:
          err instanceof Error ? err.message : "画像の生成に失敗しました。",
      };
    }
  }

  async function generateImages(scenesToProcess: SceneWithImage[]) {
    setLoadingPhase("images");
    setProgress({ current: 0, total: scenesToProcess.length });

    for (let i = 0; i < scenesToProcess.length; i++) {
      const scene = scenesToProcess[i];

      updateScene(scene.sceneNumber, {
        imageLoading: true,
        imageError: null,
      });

      const result = await generateImageForScene(scene);

      updateScene(scene.sceneNumber, {
        imageUrl: result.imageUrl ?? scene.imageUrl,
        imageError: result.imageError,
        imageLoading: false,
        adoptedVariantIndex: result.imageUrl ? null : scene.adoptedVariantIndex,
      });

      setProgress({ current: i + 1, total: scenesToProcess.length });
    }

    setLoadingPhase("idle");
  }

  async function handleGenerateVariants(sceneNumber: string) {
    const scene = scenes.find((item) => item.sceneNumber === sceneNumber);
    if (!scene) return;

    updateScene(sceneNumber, {
      variantsLoading: true,
      variantError: null,
      variants: null,
    });

    try {
      const sceneForGeneration = await prepareSceneForImageGeneration(scene);

      if (!sceneForGeneration.visualDirectorPrompt) {
        updateScene(sceneNumber, {
          variantsLoading: false,
          variantError:
            sceneForGeneration.visualDirectorError ||
            "Visual Director Promptが未生成のため、4案を生成できません。",
        });
        return;
      }

      const response = await fetch("/api/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualDirectorPrompt: sceneForGeneration.visualDirectorPrompt,
          characterBiblePrompt: getCharacterPromptForScene(sceneForGeneration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        updateScene(sceneNumber, {
          variantsLoading: false,
          variantError: data.error || "4案の生成に失敗しました。",
        });
        return;
      }

      updateScene(sceneNumber, {
        variantsLoading: false,
        variants: data.variants,
        adoptedVariantIndex: null,
        variantError: data.variants.every(
          (v: { imageUrl: string | null }) => !v.imageUrl
        )
          ? "4案すべての画像生成に失敗しました。"
          : null,
      });
    } catch (err) {
      updateScene(sceneNumber, {
        variantsLoading: false,
        variantError:
          err instanceof Error ? err.message : "4案の生成に失敗しました。",
      });
    }
  }

  async function handleGenerateScript() {
    const trimmed = eventName.trim();
    if (!trimmed) {
      setError("事件名を入力してください。");
      return;
    }

    setLoadingPhase("fact-pack");
    setScriptStatus("generating");
    setError("");
    setScenes([]);
    setScript("");
    setEditedScript("");
    setScriptTitle("");
    setScriptCharCount(0);
    setFactPack(null);

    try {
      const factPackResponse = await fetch("/api/generate-fact-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentName: trimmed }),
      });

      const factPackData = await factPackResponse.json();

      if (!factPackResponse.ok) {
        throw new Error(factPackData.error || "Fact Pack の生成に失敗しました。");
      }

      setFactPack(factPackData as FactPack);

      setLoadingPhase("script");

      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factPack: factPackData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "台本の生成に失敗しました。");
      }

      setScriptTitle(data.title);
      setScript(data.script);
      setScriptCharCount(data.characterCount);
      setScriptStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "台本の生成に失敗しました。");
      setScriptStatus("idle");
      setFactPack(null);
    } finally {
      setLoadingPhase("idle");
    }
  }

  async function handleRegenerateScript() {
    await handleGenerateScript();
  }

  function handleScriptEdit(value: string) {
    setEditedScript(value);
    setScriptCharCount(value.length);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleGenerateScript();
  }

  async function handleProceedToScenes() {
    const trimmed = eventName.trim();
    if (!trimmed) return;

    if (!activeScript.trim()) {
      setError("台本がありません。");
      return;
    }

    setLoadingPhase("scenes");
    setError("");
    setScenes([]);
    setProgress({ current: 0, total: 0 });

    try {
      const response = await fetch("/api/generate-scenes-from-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseName: trimmed,
          script: activeScript,
          sceneCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scene生成に失敗しました。");
      }

      const scenesWithImages = data.scenes.map((scene: Scene) =>
        toSceneWithImage(scene, data.characterBible, cinematicStyle)
      );
      setScenes(scenesWithImages);

      const cinematicDirectorPrompt = await generateCinematicDirection(
        scenesWithImages,
        trimmed,
        cinematicStyle
      );

      const scenesWithCinematic = scenesWithImages.map((scene: SceneWithImage) => ({
        ...scene,
        cinematicDirectorPrompt,
      }));

      const scenesWithCamera = await generateCameraDirection(
        scenesWithCinematic,
        trimmed,
        cinematicDirectorPrompt
      );

      const scenesWithPrompts = await generateVisualDirection(
        scenesWithCamera,
        trimmed,
        cinematicDirectorPrompt
      );

      const scenesWithMaster = await generateMasterDirection(
        scenesWithPrompts,
        trimmed,
        cinematicDirectorPrompt
      );

      await generateImages(scenesWithMaster);
      setScenes((prev) => normalizeScenes(prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scene生成に失敗しました。");
      setLoadingPhase("idle");
    }
  }

  const showProgress =
    loadingPhase === "fact-pack" ||
    loadingPhase === "script" ||
    loadingPhase === "scenes" ||
    loadingPhase === "cinematic" ||
    loadingPhase === "camera" ||
    loadingPhase === "prompts" ||
    loadingPhase === "master" ||
    loadingPhase === "images";
  const progressPercent =
    loadingPhase === "fact-pack"
      ? 3
      : loadingPhase === "script"
      ? 6
      : loadingPhase === "scenes"
        ? 10
        : loadingPhase === "cinematic"
        ? progress.total > 0
          ? Math.round((progress.current / progress.total) * 100)
          : 15
        : loadingPhase === "camera"
          ? progress.total > 0
            ? Math.round((progress.current / progress.total) * 100)
            : 25
          : loadingPhase === "prompts"
            ? progress.total > 0
              ? Math.round((progress.current / progress.total) * 100)
              : 35
            : loadingPhase === "master"
              ? progress.total > 0
                ? Math.round((progress.current / progress.total) * 100)
                : 45
              : progress.total > 0
                ? Math.round((progress.current / progress.total) * 100)
                : 0;
  const progressLabel =
    loadingPhase === "fact-pack"
      ? "Fact Pack生成中..."
      : loadingPhase === "script"
      ? "台本生成中..."
      : loadingPhase === "scenes"
        ? "Scene生成中..."
        : loadingPhase === "cinematic" ||
            loadingPhase === "camera" ||
            loadingPhase === "prompts" ||
            loadingPhase === "master"
          ? "Scene生成中..."
          : progress.total > 0
            ? `画像生成中... ${progress.current} / ${progress.total}`
            : "画像生成中...";
  const showProgressCount =
    loadingPhase === "images" && progress.total > 0;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Event Visual AI</h1>
            <div className={styles.projectActions}>
              <button
                type="button"
                className={styles.projectButton}
                onClick={handleSaveProject}
                disabled={loading}
              >
                保存
              </button>
              <button
                type="button"
                className={styles.projectButton}
                onClick={handleLoadProject}
                disabled={loading}
              >
                読込
              </button>
            </div>
          </div>
          <p className={styles.subtitle}>
            事件名から、ドキュメンタリー用の画像シーンを生成
          </p>
        </header>

        <div className={styles.styleField}>
          <label className={styles.styleLabel} htmlFor="scene-count">
            シーン数
          </label>
          <select
            id="scene-count"
            className={styles.styleSelect}
            value={sceneCount}
            onChange={(e) => setSceneCount(parseSceneCount(e.target.value))}
            disabled={loading}
          >
            {SCENE_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.styleField}>
          <label className={styles.styleLabel} htmlFor="cinematic-style">
            映像スタイル
          </label>
          <select
            id="cinematic-style"
            className={styles.styleSelect}
            value={cinematicStyle}
            onChange={(e) =>
              setCinematicStyle(e.target.value as CinematicStylePreset)
            }
            disabled={loading}
          >
            {CINEMATIC_STYLE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </div>

        <CharacterStudioPanel
          protagonist={characterStudio.protagonist}
          disabled={loading}
          onChange={updateProtagonist}
        />

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            placeholder="袴田事件"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loadingPhase === "fact-pack"
              ? "Fact Pack生成中..."
              : loadingPhase === "script"
              ? "台本生成中..."
              : loadingPhase === "scenes" ||
                  loadingPhase === "cinematic" ||
                  loadingPhase === "camera" ||
                  loadingPhase === "prompts" ||
                  loadingPhase === "master"
                ? "Scene生成中..."
                : loadingPhase === "images"
                  ? "画像生成中..."
                  : "生成する"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {(scriptStatus !== "idle" || scenes.length > 0) && (
          <div className={styles.stepIndicator}>
            <div
              className={`${styles.step} ${
                scriptStatus === "generating"
                  ? styles.stepActive
                  : scriptStatus === "ready" || scenes.length > 0
                    ? styles.stepDone
                    : ""
              }`}
            >
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>台本生成</span>
            </div>
            <div className={styles.stepDivider} />
            <div
              className={`${styles.step} ${
                loadingPhase === "scenes"
                  ? styles.stepActive
                  : scriptStatus === "ready" && scenes.length === 0 && !loading
                    ? styles.stepActive
                    : scenes.length > 0
                      ? styles.stepDone
                      : ""
              }`}
            >
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>Scene分解</span>
            </div>
            <div className={styles.stepDivider} />
            <div
              className={`${styles.step} ${
                scenes.length > 0 &&
                (loadingPhase === "images" || scenes.some((s) => s.imageUrl))
                  ? loadingPhase === "idle" && scenes.some((s) => s.imageUrl)
                    ? styles.stepDone
                    : styles.stepActive
                  : ""
              }`}
            >
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>画像生成</span>
            </div>
          </div>
        )}

        {scriptStatus === "ready" && scenes.length === 0 && !loading && (
          <div className={styles.scriptReview}>
            <div className={styles.scriptReviewHeader}>
              <h2 className={styles.scriptReviewTitle}>{scriptTitle}</h2>
              <span className={styles.scriptCharCount}>
                {scriptCharCount.toLocaleString()} 文字
                {isScriptEdited && (
                  <span className={styles.scriptEditedBadge}>編集済み</span>
                )}
              </span>
            </div>

            <textarea
              className={styles.scriptTextarea}
              value={activeScript}
              onChange={(e) => handleScriptEdit(e.target.value)}
              rows={20}
            />

            <div className={styles.scriptActions}>
              <button
                type="button"
                className={styles.scriptButtonSecondary}
                onClick={handleRegenerateScript}
                disabled={loading}
              >
                台本を再生成
              </button>
              <button
                type="button"
                className={styles.scriptButtonPrimary}
                onClick={handleProceedToScenes}
                disabled={loading || !activeScript.trim()}
              >
                この台本でScene生成へ進む
              </button>
            </div>
          </div>
        )}

        {showProgress && (
          <div className={styles.progress} role="status" aria-live="polite">
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>{progressLabel}</span>
              {showProgressCount && (
                <span className={styles.progressCount}>
                  {progress.current} / {progress.total}
                </span>
              )}
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {scenes.length > 0 && (
          <div className={styles.downloadBar}>
            <button
              type="button"
              className={styles.zipDownloadButton}
              onClick={handleDownloadAllZip}
              disabled={zipDownloading || downloadableSceneCount === 0}
            >
              {zipDownloading
                ? "ZIPを作成中..."
                : `全画像をZIPでダウンロード (${downloadableSceneCount})`}
            </button>
            {zipError && <p className={styles.zipError}>{zipError}</p>}
          </div>
        )}

        <section className={styles.results} aria-label="生成結果">
          {scenes.length === 0 ? (
            <div className={styles.resultsEmpty}>
              <span className={styles.resultsLabel}>結果</span>
              <p className={styles.resultsPlaceholder}>
                {loadingPhase === "script"
                  ? "ドキュメンタリー台本を生成しています..."
                  : loadingPhase === "scenes"
                    ? "台本をSceneへ分解しています..."
                    : loadingPhase === "cinematic"
                      ? "Cinematic Directorが映像演出を設計しています..."
                      : loadingPhase === "camera"
                        ? "Camera Directorがカット割りを設計しています..."
                        : loadingPhase === "master"
                          ? "Master Directorが最終レビューしています..."
                          : scriptStatus === "ready"
                            ? "台本の確認後「Scene生成へ進む」を押してください"
                            : "事件名を入力して「生成する」を押してください"}
              </p>
            </div>
          ) : (
            <div className={styles.resultsList}>
              <span className={styles.resultsLabel}>結果</span>
              <ul className={styles.sceneList}>
                {scenes.map((scene, index) => {
                  const sceneKey = scene.timelineId ?? `${scene.sceneNumber}-${index}`;
                  const regenerateMode = regeneratingScenes.get(scene.sceneNumber);
                  const isRegenerating = Boolean(regenerateMode);
                  const hasUnsavedEdit = fieldEdit?.sceneNumber === scene.sceneNumber;
                  const sceneIsEdited = isSceneEdited(scene);
                  const timelineDisabled =
                    loading ||
                    isRegenerating ||
                    scene.imageLoading ||
                    scene.variantsLoading;
                  const canGenerateImageOnly =
                    Boolean(scene.visualDirectorPrompt) &&
                    !scene.imageLoading &&
                    !isRegenerating &&
                    !scene.variantsLoading;
                  const loadingText =
                    regenerateMode === "with-instruction"
                      ? "追加指示付きで再生成中..."
                      : regenerateMode === "image-only" || isRegenerating
                        ? "画像を再生成中..."
                        : "画像を生成中...";
                  const showImageGenerateButton =
                    canGenerateImageOnly &&
                    !scene.imageUrl &&
                    !scene.imageError &&
                    loadingPhase === "idle";
                  const showImageOnlyRetry =
                    canGenerateImageOnly &&
                    !scene.imageUrl &&
                    Boolean(scene.imageError) &&
                    loadingPhase === "idle";

                  return (
                  <li key={sceneKey} className={styles.sceneCard}>
                    <div className={styles.sceneCardHeader}>
                      <h2 className={styles.sceneNumber}>Scene {scene.sceneNumber}</h2>
                      <div className={styles.sceneBadges}>
                        {hasUnsavedEdit && (
                          <span className={styles.sceneBadgeUnsaved}>未保存</span>
                        )}
                        {!hasUnsavedEdit && sceneIsEdited && (
                          <span className={styles.sceneBadgeEdited}>編集済み</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.timelineActions}>
                      <button
                        type="button"
                        className={styles.timelineButton}
                        onClick={() => handleMoveSceneUp(index)}
                        disabled={timelineDisabled || index === 0}
                        aria-label="上へ移動"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.timelineButton}
                        onClick={() => handleMoveSceneDown(index)}
                        disabled={timelineDisabled || index === scenes.length - 1}
                        aria-label="下へ移動"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={styles.timelineButtonWide}
                        onClick={() => handleDuplicateScene(index)}
                        disabled={timelineDisabled}
                      >
                        複製
                      </button>
                      <button
                        type="button"
                        className={`${styles.timelineButtonWide} ${styles.timelineButtonDanger}`}
                        onClick={() => handleDeleteScene(index, scene.sceneNumber)}
                        disabled={timelineDisabled}
                      >
                        削除
                      </button>
                      <button
                        type="button"
                        className={styles.timelineButtonAdd}
                        onClick={() => handleAddSceneAfter(index)}
                        disabled={timelineDisabled}
                      >
                        新規Scene追加
                      </button>
                    </div>

                    <div className={styles.sceneAgeField}>
                      <label
                        className={styles.sceneAgeLabel}
                        htmlFor={`scene-age-${scene.sceneNumber}`}
                      >
                        主人公の年齢（このScene）
                      </label>
                      <input
                        id={`scene-age-${scene.sceneNumber}`}
                        type="text"
                        className={styles.sceneAgeInput}
                        value={scene.sceneAge}
                        onChange={(e) =>
                          updateScene(scene.sceneNumber, {
                            sceneAge: e.target.value,
                          })
                        }
                        placeholder="例：22"
                        disabled={timelineDisabled}
                      />
                    </div>

                    {(sceneIsEdited || hasUnsavedEdit) && (
                      <button
                        type="button"
                        className={styles.sceneRevertButton}
                        onClick={() => handleRevertScene(scene.sceneNumber)}
                        disabled={
                          loading ||
                          isRegenerating ||
                          scene.imageLoading ||
                          scene.variantsLoading
                        }
                      >
                        元に戻す
                      </button>
                    )}

                    <div className={styles.sceneImageWrap}>
                      {scene.imageLoading && (
                        <div className={styles.imagePlaceholder}>
                          <span className={styles.imageLoadingText}>
                            {loadingText}
                          </span>
                        </div>
                      )}
                      {!scene.imageLoading && scene.imageUrl && (
                        <img
                          src={scene.imageUrl}
                          alt={scene.imageDescription}
                          className={styles.sceneImage}
                        />
                      )}
                      {!scene.imageLoading &&
                        !scene.imageUrl &&
                        scene.imageError && (
                          <div className={styles.imageError}>
                            <span className={styles.imageErrorLabel}>
                              画像生成エラー
                            </span>
                            <p className={styles.imageErrorText}>
                              {scene.imageError}
                            </p>
                            {showImageOnlyRetry && (
                              <button
                                type="button"
                                className={styles.imageRetryButton}
                                onClick={() =>
                                  handleGenerateImageOnly(scene.sceneNumber)
                                }
                              >
                                もう一度試す
                              </button>
                            )}
                          </div>
                        )}
                      {!scene.imageLoading &&
                        !scene.imageUrl &&
                        !scene.imageError && (
                          <div className={styles.imagePlaceholder}>
                            <span className={styles.imageLoadingText}>
                              {loadingPhase === "cinematic"
                                ? "映画演出を設計中..."
                                : loadingPhase === "prompts" ||
                                    loadingPhase === "master" ||
                                    loadingPhase === "images"
                                  ? "映像演出を設計中..."
                                  : "画像未生成"}
                            </span>
                            {showImageGenerateButton && (
                              <button
                                type="button"
                                className={styles.imageGenerateButton}
                                onClick={() =>
                                  handleGenerateImageOnly(scene.sceneNumber)
                                }
                              >
                                画像を生成
                              </button>
                            )}
                          </div>
                        )}
                    </div>

                    {showImageOnlyRetry && (
                      <button
                        type="button"
                        className={styles.imageOnlyRetryBar}
                        onClick={() =>
                          handleGenerateImageOnly(scene.sceneNumber)
                        }
                        disabled={timelineDisabled}
                      >
                        画像だけ再生成
                      </button>
                    )}

                    {SCENE_EDITABLE_FIELDS.map((field) => (
                      <SceneEditableField
                        key={`${scene.sceneNumber}-${field}`}
                        label={SCENE_EDITABLE_FIELD_LABELS[field]}
                        fieldId={`${scene.sceneNumber}-${field}`}
                        value={getSceneFieldDisplayValue(scene, field)}
                        placeholder={
                          field === "charactersInScene"
                            ? "例：袴田巌, 検察官"
                            : field === "additionalInstruction"
                              ? "例：\n・もっと暗く\n・夕焼けに\n・主人公を近く"
                              : undefined
                        }
                        isEditing={isFieldEditing(scene.sceneNumber, field)}
                        draft={
                          fieldEdit?.sceneNumber === scene.sceneNumber &&
                          fieldEdit.field === field
                            ? fieldEdit.draft
                            : getSceneFieldDisplayValue(scene, field)
                        }
                        disabled={
                          loading ||
                          isRegenerating ||
                          scene.imageLoading ||
                          scene.variantsLoading
                        }
                        rows={field === "additionalInstruction" ? 4 : 5}
                        onStartEdit={() =>
                          startSceneFieldEdit(scene.sceneNumber, field)
                        }
                        onDraftChange={(value) =>
                          setFieldEdit((prev) =>
                            prev &&
                            prev.sceneNumber === scene.sceneNumber &&
                            prev.field === field
                              ? { ...prev, draft: value }
                              : prev
                          )
                        }
                        onSave={() => saveSceneFieldEdit(field)}
                      />
                    ))}

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.cardButtonPrimary}
                        onClick={() => handleRegenerateImage(scene.sceneNumber)}
                        disabled={
                          loading ||
                          isRegenerating ||
                          scene.imageLoading ||
                          scene.variantsLoading ||
                          !scene.visualDirectorPrompt
                        }
                      >
                        画像を再生成
                      </button>
                      <button
                        type="button"
                        className={styles.cardButtonSecondary}
                        onClick={() => handleDownloadImage(scene)}
                        disabled={
                          !scene.imageUrl ||
                          isRegenerating ||
                          scene.imageLoading ||
                          scene.variantsLoading
                        }
                      >
                        画像をダウンロード
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.cardButtonAccent}
                      onClick={() =>
                        handleRegenerateWithInstruction(scene.sceneNumber)
                      }
                      disabled={
                        loading ||
                        isRegenerating ||
                        scene.imageLoading ||
                        scene.variantsLoading ||
                        !scene.visualDirectorPrompt ||
                        !scene.additionalInstruction.trim()
                      }
                    >
                      追加指示付きで再生成
                    </button>

                    <button
                      type="button"
                      className={styles.cardButtonVariants}
                      onClick={() => handleGenerateVariants(scene.sceneNumber)}
                      disabled={
                        loading ||
                        isRegenerating ||
                        scene.imageLoading ||
                        scene.variantsLoading ||
                        !scene.visualDirectorPrompt
                      }
                    >
                      4案生成
                    </button>

                    {scene.variantsLoading && (
                      <div className={styles.variantsLoading}>
                        <span className={styles.variantsLoadingText}>
                          4案を生成中...
                        </span>
                      </div>
                    )}

                    {scene.variantError && !scene.variantsLoading && (
                      <p className={styles.variantError}>{scene.variantError}</p>
                    )}

                    {scene.variants && scene.variants.length > 0 && (
                      <div className={styles.variantsSection}>
                        <h3 className={styles.fieldLabel}>4案比較</h3>
                        <div className={styles.variantGrid}>
                          {scene.variants.map((variant, index) => {
                            const isAdopted =
                              scene.adoptedVariantIndex === index;

                            return (
                            <div
                              key={`${scene.sceneNumber}-variant-${index}`}
                              className={`${styles.variantCell} ${
                                isAdopted ? styles.variantCellAdopted : ""
                              }`}
                            >
                              <div className={styles.variantImageWrap}>
                                {variant.imageUrl ? (
                                  <img
                                    src={variant.imageUrl}
                                    alt={`${scene.sceneNumber} ${variant.label}`}
                                    className={styles.variantImage}
                                  />
                                ) : (
                                  <div className={styles.variantImageError}>
                                    <span
                                      className={styles.variantImageErrorText}
                                    >
                                      {variant.error || "生成失敗"}
                                    </span>
                                  </div>
                                )}
                                {isAdopted && (
                                  <span className={styles.adoptedBadge}>
                                    採用中
                                  </span>
                                )}
                              </div>
                              <span className={styles.variantLabel}>
                                案 {index + 1}
                              </span>
                              {variant.imageUrl && (
                                <button
                                  type="button"
                                  className={styles.variantAdoptButton}
                                  onClick={() =>
                                    handleAdoptVariant(
                                      scene.sceneNumber,
                                      index
                                    )
                                  }
                                  disabled={isAdopted}
                                >
                                  この画像を採用
                                </button>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.tone === "error" ? styles.toastError : ""
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
