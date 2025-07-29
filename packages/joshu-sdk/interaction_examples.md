# Human-in-the-Loop Interaction Examples

All snippets assume you already have a running JOSHU OS websocket server (default ws://localhost:3002) and have installed the SDK:

```bash
npm install @joshu/sdk
```

```ts
import { ComputerImage, JoshuClient } from '@joshu/sdk';
```

> **Note**   In the examples below the variables such as `windowId`, `routerPath`, `actionPath` … are placeholders you would obtain from the current `OsDocument` (for instance by subscribing to state updates). The focus here is on *how* you send each interaction.

---

## 1. Relationship Choice
Ask the user (or record the agent's decision) when several candidate instances can fill a relation field.

```ts
// Create once and keep global
const client = new JoshuClient();
await client.connect();

// Build the report
const relationChoice = {
  id: crypto.randomUUID(),
  action_id: actionId,
  window_id: windowId,
  field_subpath: 'assignee',
  candidates: [
    { object_id: 'user_bob',  label: 'Bob ✨',  score: 0.55 },
    { object_id: 'user_alice', label: 'Alice', score: 0.35 },
    { object_id: 'user_eve',   label: 'Eve',   score: 0.10 }
  ],
  status: 'pending',           // or 'selected' | 'cancelled'
  created_by: 'agent',
  created_at: new Date().toISOString()
};

// Send it to the OS
await client.sendRelationshipChoice(relationChoice);
```

---

## 2. Action Choice
Present multiple mutually-exclusive actions and let a human (or the agent) pick one.

```ts
const actionChoice = {
  id: crypto.randomUUID(),
  window_id: windowId,
  agent_id: agentId,
  options: [
    { action_path: 'approve_invoice', label: 'Approve Invoice',   description: 'Mark invoice paid',          score: 0.6 },
    { action_path: 'reject_invoice',  label: 'Reject Invoice',    description: 'Invoice is invalid',        score: 0.3 },
    { action_path: 'ask_info',        label: 'Ask For Details',   description: 'Request clarification',     score: 0.1 }
  ],
  status: 'pending',                // or 'selected' | 'cancelled'
  created_by: 'agent',
  created_at: new Date().toISOString()
};

await client.sendActionChoice(actionChoice);
```

After the user makes a decision you would update the same report, e.g. set `status: 'selected'` and `chosen_action_path` then resend it.

---

## 3. Permission Request
Gate a risky or un-authorised operation.

```ts
const permissionRequest = {
  id: crypto.randomUUID(),
  agent_id: agentId,
  requested_scope: 'delete_customer',
  context: JSON.stringify({ targetCustomerId: 'cust_42' }),
  created_at: new Date().toISOString(),
  status: 'pending'               // later: 'approved' | 'denied'
};

await client.sendPermissionRequest(permissionRequest);
```

---

## 4. Action-Execution Approval
Ask confirmation before actually applying an action when confidence is low.

```ts
const approval = {
  id: crypto.randomUUID(),
  action_id: actionId,
  window_id: windowId,
  confidence: 0.42,               // agent's self-reported certainty
  created_at: new Date().toISOString(),
  status: 'pending'               // or 'approved' | 'rejected'
};

await client.sendActionApproval(approval);
```

---

## 5. Follow-Up Request
The agent needs additional input from the user.

```ts
const prerequisite = {
  id: crypto.randomUUID(),
  agent_id: agentId,
  action_id: actionId,            // optional link
  prompt: 'Could you provide the PDF blueprint?',
  created_at: new Date().toISOString(),
  status: 'pending'               // or 'answered' | 'dismissed'
};

await client.sendPrerequisite(prerequisite);

// … later, once the human answers:
prerequisite.status = 'answered';
prerequisite.answer_text = 'Here is the file: https://…';
prerequisite.answered_at = new Date().toISOString();
await client.sendPrerequisite(prerequisite);
```

---

## 6. Background Job Report
Track long-running work that continues after an action finishes.

```ts
const job = {
  id: crypto.randomUUID(),
  action_id: actionId,            // optional parent action
  job_type: 'training',           // download | training | deployment …
  description: 'Fine-tuning GPT-J on custom corpus',
  status: 'queued',               // queued | running | succeeded | failed | cancelled
  progress_percentage: 0,
  created_at: new Date().toISOString()
};

await client.sendBackgroundJob(job);

// update progress …
job.status = 'running';
job.progress_percentage = 27;
await client.sendBackgroundJob(job);

// final update …
job.status = 'succeeded';
job.progress_percentage = 100;
job.finished_at = new Date().toISOString();
await client.sendBackgroundJob(job);
```

---

### Subscribing to the document
Remember you can always watch the full **OsDocument** to react to these objects:

```ts
client.subscribe((doc) => {
  if (!doc) return;
  console.log('Current permission requests:', doc.permission_requests.length);
});
```

All six arrays (`relationship_choices`, `action_choices`, `permission_requests`, `action_approvals`, `prerequisites`, `background_jobs`) are always present on a fresh document (initialised empty). 