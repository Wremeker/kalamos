/**
 * Placeholder for the app-specific exercise results type. Exercises are not
 * part of the OSS core; custom interactive blocks should carry their own data
 * on the block and register via the block plugin API.
 */
export interface ExerciseResultData {
  [key: string]: unknown;
}
