import { Button, IconButton, SelectField, TextArea } from '../../../ui';
import type { BodyBlock } from '../../../api/careHub';

/**
 * A deliberately small block editor: headings, paragraphs, bullet lists and
 * "key points" lists. List blocks take one entry per line. The value is the
 * same JSON the store keeps in `body`.
 */

const KINDS: readonly { value: BodyBlock['type']; label: string }[] = [
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullets', label: 'Bullet list' },
  { value: 'key_points', label: 'Key points' },
];

const isList = (b: BodyBlock): b is Extract<BodyBlock, { items: string[] }> => 'items' in b;

/** Switching kind keeps the words: text <-> lines. */
const convert = (b: BodyBlock, type: BodyBlock['type']): BodyBlock => {
  const text = isList(b) ? b.items.join('\n') : b.text;
  return type === 'bullets' || type === 'key_points'
    ? { type, items: text.split('\n') }
    : { type, text: text.replace(/\n+/g, ' ') };
};

export function BodyEditor({
  value,
  onChange,
}: {
  value: BodyBlock[];
  onChange: (next: BodyBlock[]) => void;
}) {
  const set = (i: number, b: BodyBlock) => onChange(value.map((x, n) => (n === i ? b : x)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };

  return (
    <div className="chBlocks">
      {value.length === 0 && <p className="muted">No content yet. Add a block below.</p>}

      {value.map((block, i) => (
        <div className="chBlock" key={i}>
          <div className="chBlock__head">
            <SelectField
              label={`Block ${i + 1} type`}
              value={block.type}
              options={KINDS}
              onChange={(e) => set(i, convert(block, e.target.value as BodyBlock['type']))}
            />
            <span className="rowActions">
              <IconButton icon="arrowLeft" label={`Move block ${i + 1} up`} className="chRotUp" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon="arrowLeft" label={`Move block ${i + 1} down`} className="chRotDown" disabled={i === value.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon="trash" label={`Remove block ${i + 1}`} onClick={() => onChange(value.filter((_, n) => n !== i))} />
            </span>
          </div>
          {isList(block) ? (
            <TextArea
              label={`Block ${i + 1} entries`}
              hint="One entry per line."
              rows={4}
              value={block.items.join('\n')}
              onChange={(e) => set(i, { type: block.type, items: e.target.value.split('\n') })}
            />
          ) : (
            <TextArea
              label={`Block ${i + 1} text`}
              rows={block.type === 'heading' ? 1 : 4}
              value={block.text}
              onChange={(e) => set(i, { type: block.type, text: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="row">
        {KINDS.map((k) => (
          <Button
            key={k.value}
            size="sm"
            variant="secondary"
            icon="plus"
            onClick={() =>
              onChange([
                ...value,
                k.value === 'bullets' || k.value === 'key_points'
                  ? { type: k.value, items: [''] }
                  : { type: k.value, text: '' },
              ])
            }
          >
            {k.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
