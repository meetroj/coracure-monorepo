import { ClientCode, clientError } from './errors';

/**
 * Streaming a picked file straight into a signed URL.
 *
 * Shared by every upload flow in this app (doctor credentials, now a doctor's
 * consultation-document upload) because the native quirks below are subtle
 * enough that a second hand-rolled copy is how they come back.
 *
 * *** NEITHER `fetch` NOR `XMLHttpRequest` CAN READ A `file://` URI. *** Both
 * hand the URL to OkHttp, which parses http and https and refuses anything
 * else outright:
 *
 *     IllegalArgumentException: Expected URL scheme 'http' or 'https' but was 'file'
 *         at NetworkingModule.sendRequestInternalReal(NetworkingModule.kt:318)
 *
 * React Native reports that as "Network request failed", which sends everyone
 * looking at the network while the server is up and the real fault is a local
 * read. `react-native-blob-util` reads the file itself instead, so the native
 * parser never sees `file://`. The same call uploads to real S3 unchanged.
 */

/** A file still on the device, identified by the URI a picker returned. */
export type LocalFile = { uri: string };

export const isLocalFile = (body: unknown): body is LocalFile =>
  typeof (body as LocalFile | null)?.uri === 'string';

const putBytes = async (
  url: string,
  contentType: string,
  body: Blob | ArrayBuffer | Uint8Array,
): Promise<number> => {
  const response = await fetch(url, {
    method: 'PUT',
    // The store signed the URL for this exact type; sending another is a 403
    // from the store, long after the app thought it had picked a valid file.
    headers: { 'Content-Type': contentType },
    body: body as BodyInit,
  });
  return response.status;
};

/** `wrap()` wants a plain path, not a URI, so the scheme is stripped. */
const putLocalFile = async (url: string, contentType: string, uri: string): Promise<number> => {

  const blobUtil = require('react-native-blob-util').default as {
    fetch: (
      method: string,
      url: string,
      headers: Record<string, string>,
      body: unknown,
    ) => Promise<{ info: () => { status: number } }>;
    wrap: (path: string) => unknown;
  };
  const response = await blobUtil.fetch(
    'PUT',
    url,
    { 'Content-Type': contentType },
    blobUtil.wrap(decodeURI(uri.replace(/^file:\/\//, ''))),
  );
  return response.info().status;
};

/**
 * PUTs the bytes, with no Authorization header: the destination is the object
 * store, not Coracure, and the permission is already signed into the URL.
 * Sending a bearer to a third-party host leaks it.
 *
 * Throws `ClientCode.NETWORK_UNAVAILABLE` on a transport failure; a non-2xx
 * response is left for the caller to turn into its own domain error, since
 * "that upload link expired" reads differently for a credential than for a
 * lab report.
 */
export const putToSignedUrl = async (
  url: string,
  contentType: string,
  body: Blob | ArrayBuffer | Uint8Array | LocalFile,
): Promise<number> => {
  try {
    return isLocalFile(body)
      ? await putLocalFile(url, contentType, body.uri)
      : await putBytes(url, contentType, body);
  } catch {
    throw clientError(
      ClientCode.NETWORK_UNAVAILABLE,
      'We could not upload that file. Check your connection and try again.',
    );
  }
};
