import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AdminLevel } from '../../nav';
import { Button, Card, Notice, PageHeader, TextField } from '../../ui';

/**
 * Consultation lookup (§23).
 *
 * *** THIS IS A LOOKUP, NOT A LIST — AND THAT IS A BACKEND GAP, NOT A CHOICE. ***
 * `GET /admin/consultations/:id` exists; there is no list or filter endpoint
 * (gap A-2). Rather than fake a table out of whatever other queues return, the
 * screen says so and gives the one thing that does work: open by id.
 *
 * The queues that DO list consultations link straight into the detail screen,
 * so this box is the fallback for "a patient gave me a reference", not the
 * primary route in.
 */
export function Consultations({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const [id, setId] = useState('');

  const open = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = id.trim();
    if (trimmed) navigate(`/consultations/${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <PageHeader
        title="Consultations"
        description="Open one consultation to see its assignment, evidence, payment and audit trail."
      />

      <Notice tone="warning">
        There is no consultation list endpoint on the backend yet (gap A-2), so this section cannot
        offer a browsable queue. Consultations are reached by reference from the governance and
        complaint queues, or by id below.
      </Notice>

      <Card title="Open by id or reference">
        <form onSubmit={open}>
          <TextField
            label="Consultation id or reference code"
            required
            value={id}
            autoComplete="off"
            placeholder="e.g. 7f3c…  or  CC-2026-00412"
            hint="A patient quoting a reference, or an id copied from another queue."
            onChange={(e) => setId(e.target.value)}
          />
          <div className="formActions">
            <Button variant="primary" type="submit" icon="arrowRight" disabled={!id.trim()}>
              Open consultation
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Where consultations come from">
        <p className="muted">
          Until a list endpoint exists, these queues are the practical way in:
        </p>
        <ul className="endpoints">
          <li>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pending-summaries')}>
              Pending case summaries
            </Button>{' '}
            — consultations held but not written up
          </li>
          <li>
            <Button variant="ghost" size="sm" onClick={() => navigate('/safety-alerts')}>
              Safety alerts
            </Button>{' '}
            — alerts carry the consultation they came from
          </li>
          <li>
            <Button variant="ghost" size="sm" onClick={() => navigate('/complaints')}>
              Complaints
            </Button>{' '}
            — a complaint usually names one
          </li>
          <li>
            <Button variant="ghost" size="sm" onClick={() => navigate('/allocation-decisions')}>
              Allocation decisions
            </Button>{' '}
            — who was assigned, and why
          </li>
        </ul>
      </Card>
    </>
  );
}
