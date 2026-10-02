import { Icon } from '../../../ui';
import { youTubeThumbnail } from './youtube';

/**
 * The one thumbnail rule, used by the library, the editor and the preview:
 * the cover image, else the YouTube thumbnail, else a neutral placeholder.
 * A play badge marks any item that has a video.
 */
export function Thumb({
  title,
  coverUrl,
  videoId,
  className = '',
}: {
  title: string;
  coverUrl?: string;
  videoId?: string;
  className?: string;
}) {
  const src = coverUrl || (videoId ? youTubeThumbnail(videoId) : '');
  return (
    <div className={`chThumb ${className}`.trim()}>
      {src ? (
        <img src={src} alt={`Thumbnail for ${title || 'untitled item'}`} loading="lazy" />
      ) : (
        <span className="chThumb__empty" aria-hidden="true">
          <Icon name="content" size={28} />
        </span>
      )}
      {videoId && (
        <span className="chThumb__play" title="Video">
          <Icon name="arrowRight" size={16} />
          <span className="visuallyHidden">Video</span>
        </span>
      )}
    </div>
  );
}
