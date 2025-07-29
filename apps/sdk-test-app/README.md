```table-of-contents
```
# Computer API
Contains the apps, will contain permission, workflows, etc. It describes the environment that the agents can manipulate. A computer image is a template/pre-created setup of a computer that can be used immediately.

**Defining example apps**
```typescript
const apps = [{
	name: "Task Manager",
	description: "An application to manage tasks and todos",
	icon: "✅",
	tabs: [{
		path: "app_tasks_application",
		label: "Tasks",
		description: "Task management interface",
		tab_name: "Tasks",
		components: [{
			type: "text_input",
			path: "app_task_search",
			label: "Search Tasks",
			description: "Search through tasks database"
		},
		{
			type: "instances_list",
			path: "app_tasks_list",
			label: "Task List",
			description: "List of all tasks with ability to create new ones",
			can_create: true,
			prototype: "task"
		}]
	}]
},
{
	name: "Customer Management",
	description: "An application to manage customer information",
	icon: "👥",
	tabs: [{
		path: "app_customers_application",
		label: "Customers",
		description: "Customer management interface",
		tab_name: "Customers",
		components: [{
			type: "instances_list",
			path: "app_customers_list",
			label: "Customer List",
			description: "List of all customers",
			can_create: true,
			prototype: "customer"
		}]
	}]
}]
```


**Creating a computer image and starting it**
``` typescript
const computer = new ComputerImage({
	name: "SimpleTestComputer",
	apps: apps
});

// Start the computer session
const session = await computer.start();
```

At that point, the computer is started, so we have access to its internal state, including apps, choices to make, validations awaiting, etc. Of course, no agent has been started yet, so everything is empty. The computer is automatically synced between users and agents.

Note : It will be simpler in next iteration to define a computer image in the interface, assign it a name, and then directly load it when needed, such as : 

``` typescript
const computer = await ComputerImage.load("SimplifierImage")

// Start the computer session
const session = await computer.start();
```

**Getting the computer state**
```typescript
const document = computer.getState();

console.log(JSON.stringify(document, null, 2))
```

The state is a JSON object representing everything inside the computer at a given time. We can also subscribe to the stream of updates, to get everything made in the computer by agent and user as they happen. This can be used to display notifications to the user in the interface, or to detect certain events (a choice needs to be made, a form. needs to be filled, etc.).

**Subscribing to computer logs**
```typescript
const unsubscribeLogs = computer.subscribeToLogs((log) => {
	console.log('📋 New log', {
		type: log.type,
		agent_id: log.agent_id,
		date: log.date,
		content: log.content,
	});
});

// When we are done, we kill the subscription, to avoid memory leaks
unsubscribeLogs();
```
# Agent API
An agent is an autonomous entity that evolves inside a computer.

**Creating an agent and attaching it to a running computer**
```typescript
const agent = Agent.fromComputer(computer, {
	name: "SimpleTestAgent",
	description: "A simple test agent",
	instructions: "You are a helpful AI assistant. Help the user with their tasks and show them the available applications.",
});
```

Like for computer logs, we can subscribe to the logs produced by a given agent.

**Subscribing to agent logs**
```typescript
const unsubscribe = agent.subscribeToLogs((log) => {
	console.log('📋 New log from agent', {
		type: log.type,
		date: log.date,
		content: log.content,
	});
});

unsubscribe();
```

We can also get the agent state, to see if it is currently running, what are its instructions, etc.

**Get agent state**
```typescript
const state = agent.getState();

if (state) {
	console.log(`Agent: ${state.name}`);
	console.log(`Status: ${state.isActive ? 'Active' : 'Inactive'}`);
	console.log(`Tasks: ${state.tasks?.length || 0}`);
}
```

At that point, we created the computer image, started it, and spawned an agent. We didn't give work to the agent yet, so it's idle. Once the agent is created and awaiting for work, we can give it a task.

Note : Several agents with different instructions and names can be added to the same computer, and collaborate together.

**Give a task to the agent**
```typescript 
await agent.give_task("Show me the task manager app and create a new task called 'Test Task'");
```

When an agent is working, we can pause its work and resume

**Pause / Resume**
```typescript
agent.pause();
agent.resume()
```

When doing some work, an agent can do the following things : 
- open an app in a new window
- click on a link inside an app, to navigate to it
- initiate an action in an app
- when an action has been initiated, fill some fields required for that action
- when the fields are filled, run the action

Running an action has been split in 3 phases (initiation, fill fields, run) to allow the OS to estimate its level of certainty after each step and escalate to the user if needed. The user can also manually take back control over it directly by calling the computer API.

When the agent is working, logs of its actions are streamed. If the agent work updates the computer state (opening an app, clicking a link, running an action, etc.) then the computer state is automatically synced with the new informations. So for instance, when an agent makes the choice of opening the browser app, we get the structured log telling that agent xyz opened the browser app in a new window, but we also see that window "appear" in the computer state (as we would see it appear on the screen).
# Controlling the computer
## Manually controlling the computer
An important principle of the product is to allow collaboration between the human and the agents on the same computer. So every action made by an agent can also be made by the human using the computer API.

**Open an app**
```typescript
computer.openApp("notes_app")
```

Once an app is started, it opens a new window on the computer. Then, in the computer state, we can see : 
- the content of that window, formatted as a JSON object (nested components)
- the clickable links in that window (each link has a label and an id)
- the triggerable actions (each action has a label, a target object and an id)

**Click a link**
```typescript
computer.clickLink(window_id, link_id)
```

When a link is clicked, it is logged in the computer logs, and the computer state is updated and synced automatically.
## Managing computer sessions
The syncing system gives us the possibility to "freeze" a session, disconnect from it and restart it later at the same exact point. The snapshots are saved on disk, so they can be reloaded in a different process or a different script. Also, two instances of the SDK can connect to the same session, both receive the synced data, and both interact with the same computer at the same time.

```typescript
// Connect to a new session
const sessionId = await computer.start();
  
// Connect to an existing session
const existingSessionId = await computer.start('existing-session-123');

// Save current session
await computer.saveSnapshot();

// Load a different session
const newSessionId = await computer.loadSnapshot('target-session-456');

// Get current session ID
const currentSessionId = computer.getSessionId();
```

When we are done, it is important to close the computer connection, to avoid memory leaks. However, if a snapshot of the session has been saved, it can be reloaded later when needed.

**Killing the computer connection**
```typescript
computer.stop();
```

# Human-Computer Interactions
## Actions
In the OS, actions are equivalent to making a POST/UPDATE request to an 

![[Images/ActionsFlow.drawio.png]]

**Start action**
```typescript
const action = await computer.startAction(window_id, target_object, action_id)
```

This returns an action report (the current state of that action : is it validated? is it in error? what are the required fields? etc.)

**Fill fields**
```typescript
computer.fillFields(action_id, [{
	path: "title",
	type: "string",
	value: "Test Task"
}, {
	path: "priority",
	type: "number",
	value: 4
}, {
	path: "assignee",
	prototype: "user",
	value: "bob1234" // will automatically create the relationship
}])
```

The values send are automatically saved in the graph, we can get back to it later, erase values, etc. Everything is persisted and automatically filled : it is like a human filing a form online asynchronously, not like a one shot API call.

Since the agents have the ability to fill fields autonomously, the user can take control by pushing a new value for a field, to replace what the agent provided.

**Apply an action**
```typescript
computer.applyAction(action_id)
```

Once the user is happy with the provided values, an action can be "applied". The OS will try to run it using the provided fields, and will either return a success or an error. Based on the type of action, the OS may update its own state or do other actions : for instance, for the "create new note" action, if it is successful, the OS opens the newly created note in a new window. 

**Close window**
```typescript
computer.closeWindow(window_id)
```
 
As on a computer, the windows can be closed, to avoid overflowing the agent context window. The agents have the ability to close windows by themselves when they consider they are done with a task, but the human can force the closing. In that case, the agent does not have access to the content of the window anymore.
## Choices
### Relationship choice
When an agent fills a relation field and several candidates are possible, a `RelationshipChoiceReport` is pushed to `computer.getState().relationship_choices` with `status: "pending"`.

```typescript
// Example payload received from the OS (simplified)
const choice: RelationshipChoiceReport = {
  id: 'rel_123',
  action_id: 'action_42',
  window_id: 'win_a',
  field_subpath: 'assignee',
  status: 'pending',
  created_by: 'agent',
  created_at: '2025-06-11T12:00:00Z',
  candidates: [
    { object_id: 'user_bob', label: 'Bob',   score: 0.55 },
    { object_id: 'user_alice', label: 'Alice', score: 0.35 }
  ]
};

// Answer: pick Bob
choice.status = 'selected';
choice.selected_object_id = choice.candidates[0].object_id;
choice.resolved_at = new Date().toISOString();
await computer.sendRelationshipChoice(choice);
```

### Action choice
The agent may hesitate between several actions; a human decides which one will be executed.

```typescript
// Received from OS
const aChoice: ActionChoiceReport = {
  id: 'ac_1',
  window_id: 'win_tasks',
  agent_id: 'agent_main',
  created_by: 'agent',
  created_at: '2025-06-11T12:02:00Z',
  status: 'pending',
  options: [
    { action_path: 'mark_done', label: 'Mark as Done', description: '', score: 0.7 },
    { action_path: 'delete',    label: 'Delete',       description: '', score: 0.3 }
  ]
};

// Choose the first option
aChoice.status = 'selected';
aChoice.chosen_action_path = aChoice.options[0].action_path;
aChoice.resolved_at = new Date().toISOString();
await computer.sendActionChoice(aChoice);
```

## Validations
### Permission validation
If the agent requests something outside its permissions a `PermissionRequest` appears.

```typescript
const perm: PermissionRequest = {
  id: 'perm_7',
  agent_id: 'agent_main',
  requested_scope: 'delete_customer',
  created_at: '2025-06-11T12:05:00Z',
  status: 'pending'
};

perm.status = 'approved';
perm.approved_by = 'user';
perm.resolved_at = new Date().toISOString();
await computer.sendPermissionRequest(perm);
```

### Action validation
When the agent's confidence is low it asks for confirmation via an `ActionApprovalRequest`.

```typescript
const appr: ActionApprovalRequest = {
  id: 'appr_9',
  action_id: 'action_99',
  window_id: 'win_a',
  confidence: 0.38,
  created_at: '2025-06-11T12:06:00Z',
  status: 'pending'
};

appr.status = 'approved';
appr.approved_by = 'user';
appr.resolved_at = new Date().toISOString();
await computer.sendActionApproval(appr);
```

## Prerequisite
A prerequisite (formerly "follow-up") is an open question the agent needs answered.

```typescript
const prereq: Prerequisite = {
  id: 'pre_5',
  agent_id: 'agent_main',
  prompt: 'Please upload the marketing assets',
  status: 'pending',
  created_at: '2025-06-11T12:07:00Z'
};

prereq.status = 'answered';
prereq.answer_text = 'Assets uploaded to /drive/campaign.zip';
prereq.answered_at = new Date().toISOString();
await computer.sendPrerequisite(prereq);
```

## Background job in progress
Long operations (training, downloads ...) are tracked with `BackgroundJobReport` objects.

```typescript
// Progress updates
const job: BackgroundJobReport = {
  id: 'job_12',
  action_id: 'upload_7',
  job_type: 'training',
  description: 'Fine-tuning model',
  status: 'queued',
  progress_percentage: 0,
  created_at: '2025-06-11T12:08:00Z'
};

job.status = 'running';
job.progress_percentage = 50;
await computer.sendBackgroundJob(job);

job.status = 'succeeded';
job.progress_percentage = 100;
job.finished_at = new Date().toISOString();
await computer.sendBackgroundJob(job);
```