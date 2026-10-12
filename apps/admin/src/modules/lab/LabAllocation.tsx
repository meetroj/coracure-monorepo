import { useEffect, useState } from 'react';

import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { allocationSettings } from '../../mock/ops/lab';
import { Button, Card, Notice, SelectField, TextField } from '../../ui';
import { useStore } from '../kit/store';

/**
 * Allocation Settings (requirements §54-§57): PIN code + first acceptance.
 * The method is fixed; the eligibility switches and acceptance limits are the
 * knobs.
 */
export function LabAllocation({ level: _level }: { level: AdminLevel }) {
  const toast = useToast();
  const saved = useStore(allocationSettings)[0];
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const check = (key: 'pinServiceability' | 'completeBattery' | 'homeCollection', label: string, hint: string) => (
    <label className="checkbox settingToggle">
      <input type="checkbox" checked={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
      <span>
        {label} <small className="muted">{hint}</small>
      </span>
    </label>
  );

  return (
    <div className="stack">
      <Card title="Allocation method">
        <SelectField label="Method" options={[{ value: 'first_acceptance', label: 'First Acceptance' }]} value={draft.method} disabled onChange={() => undefined} />
        <Notice>
          Requests go to every eligible partner after payment. The first to accept gets the order; it locks to them and every other pending request closes. An order is never allocated twice.
        </Notice>
      </Card>

      <Card title="Eligibility settings">
        {check('pinServiceability', 'PIN-code serviceability', 'The partner must service the patient\'s PIN code.')}
        {check('completeBattery', 'Complete test-battery availability', 'The partner must be able to run every test in the order.')}
        {check('homeCollection', 'Home-collection availability', 'The partner must collect at home for that PIN code.')}
        <p className="muted small">A partner must also be active. That is always required.</p>
      </Card>

      <Card title="Acceptance settings">
        <div className="formGrid">
          <TextField
            label="Partner response timeout (minutes)"
            type="number"
            min={1}
            value={String(draft.timeoutMinutes)}
            hint="After this, an unanswered request is closed for that partner."
            onChange={(e) => setDraft({ ...draft, timeoutMinutes: Number(e.target.value) })}
          />
          <TextField
            label="Maximum eligible partners notified"
            type="number"
            min={1}
            value={String(draft.maxPartnersNotified)}
            hint="Leave high to notify every eligible partner."
            onChange={(e) => setDraft({ ...draft, maxPartnersNotified: Number(e.target.value) })}
          />
        </div>
        <div className="formActions">
          <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(saved)}>
            Discard
          </Button>
          <Button
            variant="primary"
            disabled={!dirty || draft.timeoutMinutes < 1 || draft.maxPartnersNotified < 1}
            onClick={() => {
              allocationSettings.upsert(draft);
              toast.success('Allocation settings saved.');
            }}
          >
            Save settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
