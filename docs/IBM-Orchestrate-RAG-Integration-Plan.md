# IBM watsonx Orchestrate and RAG Integration Plan

## Kessler Aegis — Orbital Debris Threat Mitigation System

**Repository:** `CatonaMoses/Kessler-Aegis`  
**Document purpose:** Define how to add IBM watsonx Orchestrate and retrieval-augmented generation (RAG) capabilities to Kessler Aegis.

---

## 1. Executive Summary

Kessler Aegis already combines a FastAPI backend, SGP4 orbital propagation, Celestrak orbital data, IBM watsonx.ai inference, and a Next.js operator interface.

The recommended architecture adds:

- **IBM watsonx.ai** for foundation-model inference, embeddings, and reranking.
- **IBM watsonx Orchestrate** for agent coordination, tool calling, multi-step workflows, and human approval steps.
- **RAG** for grounding AI answers in authoritative mission procedures, spacecraft constraints, orbital-operation documentation, and governance policies.
- **FastAPI tools** as the trusted layer for live orbital data, deterministic calculations, maneuver validation, and audit logging.

The central design principle is:

> Use deterministic software for orbital mechanics, RAG for trusted knowledge, watsonx.ai for explanation and synthesis, and watsonx Orchestrate for controlled workflow execution.

The AI must recommend and explain actions, while deterministic backend services validate all numerical results. Real maneuver authorization must remain subject to explicit human approval.

---

## 2. Existing System Context

The repository currently contains:

- A Python FastAPI backend in `main.py`.
- SGP4 propagation for orbital objects.
- Live and local-fallback orbital data from Celestrak.
- IBM watsonx.ai model integration.
- A Next.js and TypeScript frontend in `kessler-aegis-ui/`.
- A 3D orbital visualization and operator HUD.
- AI-generated collision-avoidance analysis.

The current system is therefore well positioned for an incremental integration. watsonx Orchestrate and RAG should be added around the existing services instead of replacing the orbital-propagation pipeline.

---

## 3. Target Architecture

```text
+-----------------------+
| Next.js Operator UI   |
| - Globe               |
| - Threat dashboard    |
| - AI operations panel |
+-----------+-----------+
            |
            v
+-----------------------+
| FastAPI Application    |
| - Authentication       |
| - API validation       |
| - Tool endpoints       |
| - Audit events         |
+----+------------+------+
     |            |
     v            v
+---------+  +------------------+
| Orbital |  | RAG Service      |
| Engine  |  | - Chunking       |
| - SGP4  |  | - Embeddings     |
| - TLE   |  | - Retrieval      |
| - Risk  |  | - Citations      |
+---------+  +--------+---------+
                       |
                       v
              +------------------+
              | Vector Store      |
              | Chroma/Milvus/    |
              | Elasticsearch     |
              +------------------+

+--------------------------------------+
| IBM watsonx.ai                       |
| - Foundation model inference         |
| - Embeddings                         |
| - Reranking                          |
+------------------+-------------------+
                   |
                   v
+--------------------------------------+
| IBM watsonx Orchestrate              |
| - Agent                              |
| - Tool selection                     |
| - Multi-step workflows               |
| - Human approval                    |
| - Escalation and audit coordination  |
+--------------------------------------+
```

### Responsibility boundaries

| Component | Responsibility |
|---|---|
| Next.js UI | Display threats, explanations, sources, maneuver options, and approvals |
| FastAPI | Secure application API and tool gateway |
| SGP4/orbital engine | Deterministic propagation and orbital calculations |
| RAG service | Retrieve relevant documents and return citations |
| watsonx.ai | Generate grounded explanations and structured recommendations |
| watsonx Orchestrate | Coordinate tools, workflows, approvals, and escalation |
| Vector database | Store and search document embeddings |
| Audit store | Record data, model, tool, and operator actions |

---

## 4. watsonx Orchestrate Mission Operations Agent

Create a Kessler Aegis mission-operations agent in watsonx Orchestrate.

The agent should interpret operator requests, call the appropriate backend tools, retrieve relevant knowledge, and coordinate a safe, traceable workflow.

### Example operator requests

- Assess the risk for a selected NORAD object.
- Show the five highest-risk debris objects.
- Explain why an object is classified as critical.
- Generate candidate collision-avoidance maneuvers.
- Compare three maneuver options.
- Identify the procedures applicable to a conjunction.
- Prepare a maneuver for operator approval.
- Create an incident report.
- Explain spacecraft or propulsion constraints.
- Summarize the evidence used in a recommendation.

### Recommended Orchestrate tools

| Tool | Purpose |
|---|---|
| `get_live_debris` | Retrieve current Celestrak or approved orbital data |
| `propagate_object` | Propagate a selected object to a specified epoch |
| `calculate_threat_score` | Calculate proximity, velocity, altitude, and risk metrics |
| `assess_conjunction` | Produce a structured conjunction assessment |
| `retrieve_mission_constraints` | Search RAG documents for spacecraft rules |
| `retrieve_operating_procedure` | Find applicable operational procedures |
| `generate_maneuver_options` | Produce candidate maneuver options using validated calculations |
| `evaluate_maneuver_fuel` | Estimate fuel use and burn duration |
| `validate_maneuver` | Check safety, fuel, orbital, and mission constraints |
| `request_operator_approval` | Pause a workflow for human review |
| `authorize_maneuver` | Record an approved simulated or controlled authorization |
| `create_incident_report` | Generate a report with evidence and citations |
| `record_audit_event` | Store the complete decision and execution trail |

### Tool design requirements

Every tool should:

- Accept and return structured JSON.
- Validate input with Pydantic models.
- Return explicit errors rather than silently guessing.
- Include timestamps and data versions.
- Identify whether data is live, cached, or simulated.
- Be independently testable without an LLM.
- Return enough information for the UI and audit log.

---

## 5. RAG Knowledge Base

RAG should ground the assistant in stable, authoritative information. Current orbital positions and TLE data must not be treated as ordinary document knowledge; they should be obtained through live tools.

### Recommended knowledge collections

#### 5.1 Orbital operations

- Conjunction-assessment procedures
- Collision-avoidance procedures
- Risk-classification thresholds
- Burn-window constraints
- Maneuver planning rules
- Fuel-reserve requirements
- Safe-mode procedures
- Abort and escalation procedures

#### 5.2 Spacecraft information

- Spacecraft mass
- Propulsion-system capabilities
- Maximum available delta-v
- Fuel capacity
- Minimum and maximum orbital constraints
- Attitude limitations
- Communications blackout windows
- Payload and mission constraints
- No-burn zones

#### 5.3 Orbital and debris knowledge

- COSMOS-2251 debris information
- Historical collision information
- TLE and OMM field definitions
- SGP4 limitations
- Orbital-regime descriptions
- Radar-cross-section definitions
- Threat-score methodology

#### 5.4 Governance and safety

- Human-in-the-loop requirements
- Maneuver authorization policy
- AI usage policy
- Model limitations
- Data-provenance requirements
- Incident-report templates
- Emergency escalation rules

### Keep live data in tools

Use this separation:

```text
RAG: Stable procedures, policies, manuals, and explanations
Tools: Current TLEs, positions, propagation, calculations, and system state
```

This prevents the assistant from using stale orbital information.

---

## 6. RAG Processing Pipeline

```text
Documents
   |
   v
Document extraction
   |
   v
Chunking and metadata tagging
   |
   v
watsonx.ai embeddings
   |
   v
Vector database
   |
   v
Retriever and optional reranker
   |
   v
Prompt with retrieved passages
   |
   v
watsonx.ai foundation model
   |
   v
Answer with citations and confidence
```

### Document metadata

Each indexed chunk should include:

- Document name
- Document version
- Section or page
- Document type
- Spacecraft or mission identifier
- Effective date
- Expiration date, if applicable
- Authority or owner
- Security classification
- Ingestion timestamp
- Content hash

### Vector-store recommendations

| Environment | Recommendation |
|---|---|
| Local prototype | Chroma |
| Demonstration or small deployment | Milvus |
| Enterprise search and metadata filtering | Elasticsearch |
| IBM data platform integration | watsonx.data with an appropriate vector store |

### Retrieval behavior

The RAG service should:

- Apply metadata filters before semantic search where possible.
- Retrieve a configurable number of passages.
- Apply a minimum relevance threshold.
- Optionally rerank retrieved passages.
- Return document and section citations.
- Refuse to answer when evidence is insufficient.
- Identify conflicting documents.
- Record retrieval metadata for audits.

---

## 7. Proposed Repository Structure

```text
Kessler-Aegis/
├── main.py
├── rag/
│   ├── __init__.py
│   ├── ingest.py
│   ├── embeddings.py
│   ├── retriever.py
│   ├── prompts.py
│   ├── citations.py
│   └── models.py
├── orchestrate/
│   ├── openapi.yaml
│   ├── tools.py
│   └── workflows/
│       ├── threat_assessment.yaml
│       └── maneuver_authorization.yaml
├── knowledge/
│   ├── procedures/
│   ├── spacecraft/
│   ├── orbital_mechanics/
│   └── governance/
├── tests/
│   ├── test_rag.py
│   ├── test_tools.py
│   ├── test_maneuver_safety.py
│   └── test_api_contracts.py
└── kessler-aegis-ui/
    └── src/app/
        ├── components/
        │   ├── AiOperationsPanel.tsx
        │   ├── RagCitations.tsx
        │   ├── ManeuverOptions.tsx
        │   └── ApprovalDialog.tsx
        └── page.tsx
```

---

## 8. Recommended FastAPI Endpoints

```text
POST /rag/ingest
POST /rag/query
GET  /rag/sources
GET  /rag/status

GET  /debris
GET  /debris/{norad_id}
POST /conjunctions/assess
POST /maneuvers/options
POST /maneuvers/validate
POST /maneuvers/authorize

GET  /audit/events
POST /incident-reports
```

### Example RAG request

```json
{
  "question": "What procedures apply to a critical conjunction at 780 km altitude?",
  "spacecraft_id": "AEGIS-01",
  "threat_id": "COSMOS-2251-DEB-001",
  "top_k": 5
}
```

### Example RAG response

```json
{
  "answer": "The conjunction requires operator review because it exceeds the critical-risk threshold and may require a validated avoidance maneuver.",
  "sources": [
    {
      "document": "critical-conjunction-procedure.pdf",
      "section": "4.2",
      "relevance": 0.93
    }
  ],
  "confidence": 0.88,
  "requires_human_approval": true,
  "retrieval_timestamp": "2026-10-24T00:00:00Z",
  "live_orbital_data_used": true
}
```

Every response should expose:

- Source documents
- Sections or pages
- Retrieval scores
- Retrieval timestamp
- Data version
- TLE timestamp, when applicable
- Model and prompt version
- Whether human approval is required

---

## 9. Grounded Maneuver Workflow

The primary end-to-end workflow should be called **Assess and Prepare Maneuver**.

```text
1. Operator selects a debris object.
2. FastAPI retrieves current orbital data.
3. SGP4 propagates the relevant objects.
4. The backend calculates threat metrics.
5. RAG retrieves procedures, spacecraft constraints, and approval rules.
6. watsonx.ai generates an evidence-grounded explanation.
7. The backend independently validates numerical results.
8. The system displays maneuver options.
9. The operator approves, rejects, or requests changes.
10. The system records an immutable audit event.
```

### Maneuver output

Each candidate should include:

- Collision probability
- Predicted miss distance
- Delta-v
- Burn duration
- Estimated fuel consumption
- Burn window
- Resulting orbital changes
- Operational risks
- Constraints checked
- RAG sources used
- Validation status
- Approval status

### Safety boundary

watsonx Orchestrate should recommend and prepare a maneuver, but it should not autonomously issue a real spacecraft command.

The required sequence is:

```text
AI recommendation
      |
      v
Deterministic safety validation
      |
      v
Operator approval
      |
      v
Mission-control export or command gateway
```

For a prototype, `authorize_maneuver` should record a simulated authorization only.

---

## 10. User Interface Features

Add an **AI Operations** panel to the existing dashboard.

### Recommended features

- Natural-language mission assistant
- Explain-this-threat action
- RAG source citations
- Threat-assessment timeline
- Candidate maneuver comparison
- Delta-v and fuel charts
- Confidence and uncertainty display
- Human-approval warning
- Approval and rejection workflow
- Audit-history viewer
- Knowledge-base refresh status
- Tool-execution trace
- TLE source and age display
- Model and prompt version display
- Live, cached, or simulated data indicator

### Example operator panel

```text
THREAT: COSMOS-2251 DEB-001
RISK: CRITICAL
MISS DISTANCE: 0.12 km
COLLISION PROBABILITY: 0.071
DATA AGE: 4 minutes

AI RECOMMENDATION
Option A: delta-v 0.42 m/s | Fuel 0.8 kg | Miss distance 2.8 km
Option B: delta-v 0.61 m/s | Fuel 1.2 kg | Miss distance 5.4 km

EVIDENCE
- Critical Conjunction Procedure, Section 4.2
- AEGIS-01 Propulsion Constraints, Section 3
- Current SGP4 propagation result

[VALIDATE] [REQUEST APPROVAL] [REJECT]
```

---

## 11. Environment Variables

Add the following to `.env.example` and keep all secrets server-side:

```env
WATSONX_URL=
WATSONX_APIKEY=
WATSONX_PROJECT_ID=

WATSONX_ORCHESTRATE_URL=
WATSONX_ORCHESTRATE_APIKEY=
WATSONX_ORCHESTRATE_AGENT_ID=

RAG_VECTOR_STORE=milvus
RAG_VECTOR_URL=
RAG_VECTOR_APIKEY=
RAG_COLLECTION_NAME=kessler_aegis_knowledge

RAG_TOP_K=5
RAG_MIN_RELEVANCE_SCORE=0.70
RAG_REQUIRE_CITATIONS=true

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Never expose IBM API keys or vector-store credentials to the Next.js browser client.

---

## 12. Implementation Plan

### Phase 1 — RAG prototype

1. Create the `knowledge/` directory.
2. Add five to ten authoritative documents.
3. Implement extraction, chunking, and metadata tagging.
4. Generate embeddings.
5. Store vectors in Chroma or Milvus.
6. Add `POST /rag/query`.
7. Display citations in the UI.
8. Evaluate retrieval against predefined questions.

### Phase 2 — Backend tool layer

1. Convert existing backend functions into explicit tools.
2. Add Pydantic input and output models.
3. Add validation and structured errors.
4. Publish an OpenAPI specification.
5. Test each tool without an LLM.
6. Add audit events for tool execution.

### Phase 3 — watsonx Orchestrate

1. Create the Kessler Aegis agent.
2. Register or import the OpenAPI tools.
3. Define the threat-assessment workflow.
4. Define the maneuver-preparation workflow.
5. Add human approval checkpoints.
6. Add escalation and failure handling.
7. Connect the Next.js operations panel.

### Phase 4 — Safety and production hardening

1. Add authentication and role-based access control.
2. Add rate limiting.
3. Add document versioning.
4. Track model, prompt, and retrieval versions.
5. Add retrieval-quality evaluation.
6. Add numerical maneuver regression tests.
7. Add fallback behavior when external services are unavailable.
8. Require explicit approval before authorization.
9. Add monitoring and alerting.
10. Conduct security and operational reviews.

---

## 13. Features Added by the Integration

Together, watsonx Orchestrate and RAG would provide:

1. Natural-language mission control.
2. Multi-step threat-assessment workflows.
3. Grounded answers based on mission documentation.
4. Source-cited explanations.
5. Live-data tool calling.
6. Candidate maneuver comparison.
7. Human-in-the-loop authorization.
8. Consistent operating procedures.
9. Auditability and decision traceability.
10. Reusable integrations with future mission systems.
11. Operator training and simulation support.
12. Reduced hallucination risk.
13. Faster incident-report generation.
14. Separation between deterministic calculations and generative explanations.
15. Clear visibility into data freshness and uncertainty.

---

## 14. Testing Strategy

### RAG tests

- Verify relevant documents are retrieved.
- Verify irrelevant documents are excluded.
- Verify citations point to real sections.
- Verify stale or expired documents are filtered.
- Verify insufficient evidence produces a safe refusal.
- Verify conflicting documents are reported.

### Tool tests

- Test live-data retrieval and local fallback.
- Test malformed NORAD identifiers.
- Test missing spacecraft constraints.
- Test invalid epochs.
- Test SGP4 propagation failures.
- Test numerical boundary conditions.

### Safety tests

- Reject maneuvers exceeding delta-v limits.
- Reject maneuvers that violate fuel reserves.
- Reject maneuvers without required evidence.
- Require approval for critical or high-risk events.
- Prevent direct execution from an LLM-only path.
- Verify duplicate authorization requests are handled safely.

### Evaluation questions

Create a fixed evaluation set, such as:

- Which procedure applies to a critical conjunction?
- What spacecraft constraint limits this maneuver?
- Which source defines the risk threshold?
- What should happen when TLE data is stale?
- When is operator approval mandatory?

Track retrieval precision, citation accuracy, groundedness, and refusal quality.

---

## 15. Security and Governance

The implementation should include:

- Server-side secret storage.
- Role-based permissions.
- Separate viewer, analyst, approver, and administrator roles.
- Prompt-injection-resistant document handling.
- Document ownership and versioning.
- Input and output validation.
- Audit logs for every tool call.
- Model and prompt version tracking.
- Clear data-retention policy.
- Explicit distinction between simulated and operational actions.
- Human approval for high-impact decisions.

RAG documents should be treated as untrusted input until validated. A document must not be allowed to override system safety rules or instruct the agent to bypass approval controls.

---

## 16. Recommended First Milestone

The first useful milestone should be a read-only, grounded threat assistant:

1. The operator selects a debris object.
2. The backend retrieves current orbital data.
3. The backend calculates threat metrics.
4. RAG retrieves applicable procedures and spacecraft constraints.
5. watsonx.ai explains the threat with citations.
6. The UI displays the evidence and data freshness.
7. No maneuver authorization is performed yet.

After this is reliable, add candidate maneuvers, deterministic validation, and human approval.

---

## 17. Final Recommendation

Implement the integration incrementally and preserve strong boundaries:

- **FastAPI and SGP4** remain responsible for orbital truth.
- **watsonx.ai** provides grounded language generation and retrieval services.
- **RAG** supplies stable, authoritative operational knowledge.
- **watsonx Orchestrate** coordinates tools and approvals.
- **Next.js** provides the operator experience.
- **Human operators** remain responsible for final authorization.

This approach gives Kessler Aegis an explainable, extensible, and safer AI operations layer without allowing a language model to independently control orbital calculations or spacecraft actions.
