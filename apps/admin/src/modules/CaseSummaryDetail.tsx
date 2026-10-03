import { useCallback, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  summaries,
  type CaseSummaryDetail as Detail,
  type CaseSummaryRow,
} from "../api/caseSummaries";
import { useResource } from "../lib/useResource";
import { useToast } from "../lib/toast";
import type { AdminLevel } from "../nav";
import {
  Async,
  Button,
  Card,
  DefinitionList,
  Notice,
  PageHeader,
  StatusBadge,
  Tabs,
} from "../ui";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : "Not yet";

const LABEL: Record<CaseSummaryRow["status"], string> = {
  generated: "Generated",
  reviewed: "Reviewed by doctor",
  failed: "Needs attention",
  awaiting: "Awaiting generation",
};

type Loaded = { row: CaseSummaryRow; detail: Detail };

/** One case summary as a page: what the patient gave, what the doctor documented, the generated summary. */
export function CaseSummaryDetail(props: {
  level: AdminLevel;
  /** Given when shown inside another page (a consultation), instead of read from the route. */
  summaryId?: string;
  /** Inside another page: no page header, and the tab is kept in the component, not the URL. */
  embedded?: boolean;
}) {
  const routeId = useParams().summaryId;
  const summaryId = props.summaryId ?? routeId ?? "";
  const embedded = Boolean(props.embedded);
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [localTab, setLocalTab] = useState("patient");
  const fetcher = useCallback(() => summaries.get(summaryId), [summaryId]);
  const state = useResource<Loaded>(fetcher, [summaryId]);
  const wanted = embedded ? localTab : params.get("tab");
  const tab = ["notes", "plan", "recommendation", "summary", "followup"].includes(wanted ?? "")
    ? (wanted as string)
    : "patient";

  const regenerate = async () => {
    try {
      const row = await summaries.regenerate(summaryId);
      state.setData(state.data && { ...state.data, row });
      toast.success(`Summary for ${row.referenceCode} regenerated.`);
    } catch (e) {
      toast.fromError(e, "Could not regenerate the summary.");
    }
  };

  return (
    <Async state={state} resource="this case summary">
      {({ row, detail }) => (
        <>
          {embedded ? (
            <div className="row">
              <StatusBadge
                status={row.status}
                label={LABEL[row.status]}
                tone={
                  row.status === "failed"
                    ? "danger"
                    : row.status === "reviewed"
                      ? "positive"
                      : "info"
                }
              />
              <span className="muted">
                {row.doctorName ?? "-"} · {row.patientLabel} · {row.serviceName}
              </span>
              {row.status === "failed" && (
                <Button size="sm" variant="secondary" icon="refresh" onClick={regenerate}>
                  Regenerate
                </Button>
              )}
            </div>
          ) : (
          <PageHeader
            title={`Summary ${row.referenceCode}`}
            titleAside={
              <StatusBadge
                status={row.status}
                label={LABEL[row.status]}
                tone={
                  row.status === "failed"
                    ? "danger"
                    : row.status === "reviewed"
                      ? "positive"
                      : "info"
                }
              />
            }
            actions={
              <>
                <span className="muted">
                  {row.doctorName ?? "-"} · {row.patientLabel} · {row.serviceName}
                </span>
                {row.status === "failed" && (
                  <Button variant="secondary" icon="refresh" onClick={regenerate}>
                    Regenerate
                  </Button>
                )}
              </>
            }
          />
          )}
          {row.failureReason && (
            <Notice tone="danger">{row.failureReason}</Notice>
          )}

          <Tabs
            tabs={[
              { id: "patient", label: "Details" },
              {
                id: "notes",
                label: detail.prescriber
                  ? "Clinical Notes & Diagnosis"
                  : "Assessment",
              },
              {
                id: "plan",
                label: detail.prescriber ? "Prescription" : "Care Plan",
              },
              { id: "recommendation", label: "Recommendation" },
              { id: "summary", label: "Case Summary" },
              { id: "followup", label: "Follow-up" },
            ]}
            active={tab}
            onChange={(id) =>
              embedded
                ? setLocalTab(id)
                : setParams(id === "patient" ? {} : { tab: id }, { replace: true })
            }
          />

          {tab === "patient" && (
            <>
            <Card title="Doctor details">
              <DefinitionList
                items={[
                  { label: "Name", value: row.doctorName },
                  { label: "Professional type", value: detail.doctor.type },
                  { label: "Registration number", value: detail.doctor.registrationNumber },
                  { label: "Languages", value: detail.doctor.languages },
                ]}
              />
            </Card>
            <Card title="Patient details">
              <DefinitionList
                items={[
                  { label: "Patient", value: row.patientLabel },
                  { label: "Gender · Age", value: `${detail.patient.gender} · ${detail.patient.age} years` },
                  { label: "Service", value: row.serviceName },
                  { label: "Mode", value: detail.patient.mode },
                  { label: "Duration", value: detail.patient.duration },
                  { label: "Payment", value: detail.patient.payment },
                  { label: "Consultation held", value: when(row.consultationAt) },
                ]}
              />
            </Card>
            <Card title="Patient's complaint">
              <p>{detail.patient.complaint}</p>
            </Card>
            <Card title="Medical history">
              <DefinitionList
                items={[
                  { label: "Any previous history", value: detail.patient.history },
                  { label: "Medication history", value: detail.patient.medication },
                ]}
              />
            </Card>
            <Card title="Uploaded by the patient">
              {detail.patient.reports.length ? (
                <ul>
                  {detail.patient.reports.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No documents uploaded.</p>
              )}
            </Card>
            </>
          )}

          {tab === "notes" && (
            <Card
              title={
                detail.prescriber ? "Clinical Notes & Diagnosis" : "Assessment"
              }
            >
              {detail.notes.length ? (
                <DefinitionList items={detail.notes} />
              ) : (
                <p className="muted">Not documented yet.</p>
              )}
            </Card>
          )}

          {tab === "plan" && (
            <Card title={detail.prescriber ? "Prescription" : "Care Plan"}>
             <div className="stack">
              {detail.medications.length > 0 && (
               <div className="tableWrap">
                <table className="table">
                  <caption className="visuallyHidden">Medications</caption>
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dose</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.medications.map((m) => (
                      <tr key={m.name}>
                        <td>{m.name}</td>
                        <td>{m.dose}</td>
                        <td>{m.frequency}</td>
                        <td>{m.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
              )}
              {detail.plan.length ? (
                <DefinitionList items={detail.plan} />
              ) : (
                <p className="muted">Not documented yet.</p>
              )}
              {detail.signedBy && (
                <p className="muted" style={{ margin: 0 }}>
                  Digitally signed by {detail.signedBy}
                </p>
              )}
             </div>
            </Card>
          )}

          {tab === "followup" && (
            <>
              {detail.followUp ? (
                <>
                  <Card title="Pathway">
                    <DefinitionList
                      items={[
                        { label: "Pathway", value: detail.followUp.pathway },
                        { label: "Daily questions", value: String(detail.followUp.questions) },
                        {
                          label: "Status",
                          value: (
                            <StatusBadge
                              status={detail.followUp.status === "active" ? "in_progress" : detail.followUp.status}
                              label={detail.followUp.status[0].toUpperCase() + detail.followUp.status.slice(1)}
                            />
                          ),
                        },
                      ]}
                    />
                  </Card>
                  <Card title="Plan schedule">
                    <DefinitionList
                      items={[
                        { label: "Start date", value: new Date(detail.followUp.startedAt).toLocaleDateString() },
                        { label: "Review date", value: new Date(detail.followUp.reviewAt).toLocaleDateString() },
                        { label: "Check-in duration", value: `${detail.followUp.durationDays} days` },
                        { label: "Check-ins", value: String(detail.followUp.durationDays) },
                        {
                          label: "Progress",
                          value: detail.followUp.day
                            ? `Day ${detail.followUp.day} of ${detail.followUp.durationDays}`
                            : "Not running",
                        },
                      ]}
                    />
                  </Card>
                  <Card title="Daily check-ins">
                    {detail.followUp.checkIns.length === 0 ? (
                      <p className="muted">No check-ins yet.</p>
                    ) : (
                      <ol className="timeline">
                        {detail.followUp.checkIns.map((c) => (
                          <li key={c.date} className="timeline__item">
                            <span className="timeline__date">{new Date(c.date).toLocaleDateString()}</span>
                            <span className="timeline__text">
                              <StatusBadge
                                status={c.colour}
                                tone={{ green: "positive", amber: "warning", red: "danger" }[c.colour] as "positive" | "warning" | "danger"}
                                label={c.colour[0].toUpperCase() + c.colour.slice(1)}
                              />
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Card>
                </>
              ) : (
                <Card title="Follow-up plan">
                  <p className="muted">No follow-up plan was assigned for this case.</p>
                </Card>
              )}
            </>
          )}

          {tab === "recommendation" && (
            <>
              {detail.recommendations ? (
                <>
                  <Card title="Recommended tools">
                    {detail.recommendations.tools.length ? (
                      <DefinitionList
                        items={detail.recommendations.tools.map((t) => ({ label: t.name, value: t.description }))}
                      />
                    ) : (
                      <p className="muted">No tools recommended.</p>
                    )}
                  </Card>
                  <Card title="Recommended modules">
                    {detail.recommendations.modules.length ? (
                      <DefinitionList
                        items={detail.recommendations.modules.map((m) => ({ label: m.name, value: m.description }))}
                      />
                    ) : (
                      <p className="muted">No modules recommended.</p>
                    )}
                  </Card>
                  <Card title="Note to patient">
                    {detail.recommendations.note ? (
                      <p>{detail.recommendations.note}</p>
                    ) : (
                      <p className="muted">No note was added.</p>
                    )}
                  </Card>
                </>
              ) : (
                <Card title="Recommendation">
                  <p className="muted">The doctor made no Care Hub recommendation for this case.</p>
                </Card>
              )}
            </>
          )}

          {tab === "summary" && (
            <Card title="Case Summary">
              {detail.summary ? (
                <p>{detail.summary}</p>
              ) : (
                <p className="muted">Not generated yet.</p>
              )}
            </Card>
          )}
        </>
      )}
    </Async>
  );
}
