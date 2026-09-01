export { AntiSpam, createAntiSpam } from "./AntiSpam";
export { resolveConfig, DEFAULT_CONFIG, mergeDeep } from "./defaults";
export { WARN_TEMPLATES, LOG_LABELS, resolveWarnMessage } from "./locale";
export { timeoutDuration } from "./enforcement";
export { MemoryStore } from "./store/MemoryStore";
export { DEFAULT_BLOCKED_EXTENSIONS } from "./detectors/files";
export { inspectGhostPing } from "./detectors/ghost";
export {
  DEFAULT_PHISHING_KEYWORDS,
  DEFAULT_SHORTENERS,
  OFFICIAL_BRANDS,
  extractUrls,
} from "./utils/urls";
export { normalizeText, countZalgo, countNewlines, countInvisible } from "./utils/normalize";
export { similarity } from "./utils/similarity";

export type {
  ActionResult,
  ActionType,
  AntiSpamOptions,
  AntiSpamStats,
  CapsConfig,
  DeepPartial,
  Detector,
  DetectorType,
  DuplicateConfig,
  EmojiConfig,
  FileConfig,
  FloodConfig,
  GhostPingConfig,
  HopConfig,
  IgnoreLists,
  ImageConfig,
  ImageHashMode,
  Incident,
  InvisibleConfig,
  EchoConfig,
  SecretConfig,
  AttachConfig,
  LinkConfig,
  MentionConfig,
  NewlineConfig,
  PresetName,
  PunishmentConfig,
  PunctuationConfig,
  ResolvedConfig,
  Severity,
  SpoilerConfig,
  AccountConfig,
  LengthConfig,
  Locale,
  TimeoutScale,
  WordConfig,
  ZalgoConfig,
} from "./types";
