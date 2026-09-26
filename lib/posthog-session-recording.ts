/**
 * Session replay follows identified analytics consent (EU accept, or US
 * default). Inputs are always masked at init (`maskAllInputs: true`).
 * The SDK is not hard-disabled with `disable_session_recording: true` when
 * consent is already granted, so recordings can start; these helpers start
 * or stop the recorder when that consent changes.
 */

export type PostHogReplayClient = {
  startSessionRecording: () => void;
  stopSessionRecording: () => void;
};

export function syncPostHogSessionRecording(
  client: PostHogReplayClient,
  analyticsEnabled: boolean,
) {
  if (analyticsEnabled) {
    client.startSessionRecording();
    return;
  }

  client.stopSessionRecording();
}
