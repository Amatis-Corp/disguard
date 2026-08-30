export { AntiSpam, createAntiSpam } from "./AntiSpam";
export { resolveConfig, DEFAULT_CONFIG, mergeDeep } from "./defaults";
export { MemoryStore } from "./store/MemoryStore";
export {
  DEFAULT_PHISHING_KEYWORDS,
  DEFAULT_SHORTENERS,
  OFFICIAL_BRANDS,
  extractUrls,
} from "./utils/urls";
export { normalizeText } from "./utils/normalize";
export { similarity } from "./utils/similarity";

export type {
  ActionResult,
  ActionType,
  AntiSpamOptions,
  CapsConfig,
  DeepPartial,
  DetectorType,
  DuplicateConfig,
  EmojiConfig,
  FloodConfig,
  IgnoreLists,
  ImageConfig,
  ImageHashMode,
  Incident,
  LinkConfig,
  MentionConfig,
  PresetName,
  PunishmentConfig,
  ResolvedConfig,
  Severity,
} from "./types";
