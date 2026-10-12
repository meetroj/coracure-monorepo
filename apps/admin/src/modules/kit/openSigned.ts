import { isWebUrl } from '../../api/liveProviders';

/**
 * Opens a short-lived signed link in its own tab.
 *
 * The tab is opened first, inside the click, so a pop-up blocker lets it
 * through; the link is fetched after and put into it. A link that is not a web
 * address is refused, and the empty tab is closed on any failure.
 */
export async function openSigned(getLink: () => Promise<{ url: string }>): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  if (tab) tab.opener = null;
  try {
    const { url } = await getLink();
    if (!isWebUrl(url)) throw new Error('The backend returned a link that is not a web address.');
    if (tab) tab.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    tab?.close();
    throw e;
  }
}
