import { Box } from "../components/Box";
import { Route } from "../components/Route";
import { Text } from "../components/Text";
import { Link } from "../components/Link";

export default function NotesApp() {
	return (
		<Box>
			<Text value="Notes App" />
			<Link label="Home" path="/" />
			<Link label="New Note" path="/new" />

			<Route subpath="/">
				<Text value="All Notes" />
				<Link label="Note 1" path="/note/123" />
			</Route>

			<NewNote />

			<Route subpath="/note/:id">
				<Text value="Note details :id" />
				<Link label="Edit" path="edit" />
				<Link label="Delete" path="delete" />

				<EditNote />
				<DeleteNote />
			</Route>
		</Box>
	);
}

function NewNote() {
	return (
		<Route subpath="/new">
			<Text value="Create new note" />
		</Route>
	);
}

function EditNote() {
	return (
		<Route subpath="/edit">
			<Text value="Edit note :id" />
		</Route>
	);
}

function DeleteNote() {
	return (
		<Route subpath="/delete">
			<Text value="Delete note :id" />
		</Route>
	);
}
