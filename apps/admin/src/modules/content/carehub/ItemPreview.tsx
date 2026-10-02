import type { CareHubInput } from '../../../api/careHub';
import { typeLabel } from '../../../api/careHub';
import { Card } from '../../../ui';
import { Thumb } from './Thumb';
import { youTubeWatchUrl } from './youtube';

/** "How patients see it": the shelf card and the opened article. */
export function ItemPreview({ item }: { item: CareHubInput }) {
  const title = item.title.trim() || 'Untitled item';
  const lines = item.body.filter((b) => ('items' in b ? b.items.some((l) => l.trim()) : b.text.trim()));

  return (
    <Card title="How patients see it" className="chPreview">
      <p className="muted">In the shelf</p>
      <div className="chPhone">
        <Thumb title={title} coverUrl={item.coverUrl} videoId={item.videoId} />
        <div className="chPhone__pad">
          <small className="chType">{typeLabel(item.type)}</small>
          <strong>{title}</strong>
          {item.summary.trim() && <p className="chClamp">{item.summary}</p>}
        </div>
      </div>

      <p className="muted">Opened</p>
      <article className="chPhone chArticle">
        {item.videoId ? (
          <a href={youTubeWatchUrl(item.videoId)} target="_blank" rel="noreferrer" aria-label={`Watch the video for ${title}`}>
            <Thumb title={title} coverUrl={item.coverUrl} videoId={item.videoId} />
          </a>
        ) : (
          <Thumb title={title} coverUrl={item.coverUrl} />
        )}
        <div className="chPhone__pad">
          <h3>{title}</h3>
          {item.summary.trim() && <p className="muted">{item.summary}</p>}
          {lines.map((b, i) =>
            'items' in b ? (
              <div key={i} className={b.type === 'key_points' ? 'chKey' : undefined}>
                {b.type === 'key_points' && <strong>Key points</strong>}
                <ul>
                  {b.items.filter((l) => l.trim()).map((l, n) => (
                    <li key={n}>{l}</li>
                  ))}
                </ul>
              </div>
            ) : b.type === 'heading' ? (
              <h4 key={i}>{b.text}</h4>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
          {item.type === 'support_org' && (
            <div className="chKey">
              <strong>{item.verifiedOrg ? 'Verified organisation' : 'Not yet verified'}</strong>
              {item.helplines.filter((h) => h.trim()).map((h) => (
                <p key={h}>{h}</p>
              ))}
              {item.website && <p>{item.website}</p>}
            </div>
          )}
        </div>
      </article>
    </Card>
  );
}
