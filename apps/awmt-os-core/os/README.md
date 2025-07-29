# os

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# OS

This is the AWMT OS core, which handles the operating system's functioning.

## Components

### Route Component

The Route component allows you to create navigation paths within your app. It works similar to React Router.

#### Usage Example

```tsx
// Example notes app with routing
import { Route } from './components/Route';

// Root component
export default function NotesApp() {
  return (
    <div>
      <h1>Notes App</h1>
      <Route subpath="/">
        {/* Home route - shows list of notes */}
        <div>
          <h2>All Notes</h2>
          <ul>
            <li>Note 1</li>
            <li>Note 2</li>
          </ul>
        </div>
      </Route>
      
      <Route subpath="/new">
        {/* Create new note form */}
        <div>
          <h2>Create New Note</h2>
          <form>
            <input type="text" placeholder="Title" />
            <textarea placeholder="Content"></textarea>
            <button>Save</button>
          </form>
        </div>
      </Route>
      
      <Route subpath="/note/:id">
        {/* Note detail view with dynamic parameter */}
        <div>
          <h2>Note Details</h2>
          <div>
            <h3>Title will be filled from :id param</h3>
            <p>Note content will go here</p>
          </div>
          <button>Edit</button>
        </div>
      </Route>
    </div>
  );
}
```

#### How It Works

1. The `Route` component takes a `subpath` prop that defines the route path.
2. Routes can contain path parameters like `:id` which will be extracted and available in `route_params`.
3. When rendering, only the routes that match the current path are displayed.
4. Nested routes work by combining parent and child paths.
5. The AST always includes all routes, but the rendered output only shows the matching routes.

To render the app with different routes:

```ts
// Render the app with different router paths
const params = { router_path: '/' };            // Shows the home route
const params = { router_path: '/new' };         // Shows the new note form
const params = { router_path: '/note/123' };    // Shows note with id 123
```

### Link Component

The Link component creates clickable links that can navigate to different routes within your app.

#### Usage Example

```tsx
// Example of using links with routes
import { Route } from './components/Route';
import { Link } from './components/link';

export default function NotesApp() {
  return (
    <div>
      <h1>Notes App</h1>
      <div className="navigation">
        <Link label="Home" path="/" />
        <Link label="New Note" path="/new" />
      </div>
      
      <Route subpath="/">
        <div>
          <h2>Notes List</h2>
          <ul>
            <li><Link label="Note 1" path="/note/1" /></li>
            <li><Link label="Note 2" path="/note/2" /></li>
          </ul>
        </div>
      </Route>
      
      <Route subpath="/note/:id">
        <div>
          <h2>Note Details</h2>
          <p>Viewing note with ID: :id</p>
          
          {/* Example of nested routes with relative paths */}
          <Link label="Edit Note" path="edit" /> {/* Relative path - will navigate to /note/:id/edit */}
          <Link label="Delete Note" path="delete" /> {/* Relative path */}
          <Link label="Back to Home" path="/" /> {/* Absolute path */}
          
          <Route subpath="/edit">
            <h3>Edit Note :id</h3>
          </Route>
          
          <Route subpath="/delete">
            <h3>Delete Note :id</h3>
          </Route>
        </div>
      </Route>
    </div>
  );
}
```

#### How It Works

1. The `Link` component takes `label` and `path` props.
2. The `path` prop can be:
   - Absolute (starts with `/`): Navigates from the root of the app
   - Relative (no leading `/`): Navigates relative to the current path
3. Links are rendered as clickable elements that add entries to the `links` array in the ViewNode.
4. When a link is clicked, the system updates the `router_path` which causes routes to re-render accordingly.
