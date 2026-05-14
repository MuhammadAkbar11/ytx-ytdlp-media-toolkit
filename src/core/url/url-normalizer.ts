export class UrlNormalizer {
  /**
   * Normalizes a YouTube URL into a canonical form.
   * - Strips tracking parameters (utm_*, feature, share, etc.)
   * - Converts shorts URLs to standard watch URLs
   * - Converts youtu.be URLs to standard watch URLs
   * - Normalizes mobile domains to standard domains
   *
   * @param input The raw URL input string.
   * @returns The normalized canonical URL.
   */
  normalize(input: string): string {
    try {
      const url = new URL(input);
      const host = url.hostname.replace(/^www\./, '');

      // 1. Strip tracking and non-essential parameters
      const paramsToStrip = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'feature',
        'share',
        'si', // YouTube's share identifier
      ];

      paramsToStrip.forEach((p) => url.searchParams.delete(p));

      // 2. Normalize shorts to watch URLs
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2];
        if (id) {
          url.host = 'www.youtube.com';
          url.pathname = '/watch';
          url.searchParams.set('v', id);
        }
      }

      // 3. Normalize youtu.be to watch URLs
      if (host === 'youtu.be') {
        const id = url.pathname.slice(1);
        if (id) {
          url.host = 'www.youtube.com';
          url.pathname = '/watch';
          url.searchParams.set('v', id);
        }
      }

      // 4. Normalize mobile domain
      if (host === 'm.youtube.com') {
        url.host = 'www.youtube.com';
      }

      // 5. Normalize music domain (keep it distinct but clean)
      if (host === 'music.youtube.com') {
        // Keep music.youtube.com but still stripped of tracking params
      }

      return url.toString();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // If it's not a valid URL, return it as is (validation will fail later)
      return input;
    }
  }
}
