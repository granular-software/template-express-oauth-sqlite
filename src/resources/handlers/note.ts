import { z } from "zod";
import { createResource } from "mcpresso";
import { NoteSchema, type Note } from "../schemas/Note.js";

// In-memory storage (replace with your database)
const notes: Note[] = [];

// Create the notes resource
export const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  methods: {
    get: {
      handler: async ({ id }, user) => {
        if (!user) throw new Error("Authentication required");
        const note = notes.find((note) => note.id === id);
        if (!note || note.authorId !== user.id) {
          throw new Error("Note not found or access denied");
        }
        return note;
      },
    },
    list: {
      handler: async (_, user) => {
        if (!user) throw new Error("Authentication required");
        return notes.filter((note) => note.authorId === user.id);
      },
    },
    create: {
      handler: async (data, user) => {
        if (!user) throw new Error("Authentication required");
        const newNote = {
          id: Math.random().toString(36).substr(2, 9),
          title: data.title || "",
          content: data.content || "",
          authorId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        notes.push(newNote);
        return newNote;
      },
    },
    update: {
      handler: async ({ id, ...data }, user) => {
        if (!user) throw new Error("Authentication required");
        const index = notes.findIndex((note) => note.id === id);
        if (index === -1) {
          throw new Error("Note not found");
        }
        if (notes[index].authorId !== user.id) {
          throw new Error("Access denied");
        }
        const updatedNote = { 
          ...notes[index], 
          ...data, 
          updatedAt: new Date() 
        };
        notes[index] = updatedNote;
        return updatedNote;
      },
    },
    delete: {
      handler: async ({ id }, user) => {
        if (!user) throw new Error("Authentication required");
        const index = notes.findIndex((note) => note.id === id);
        if (index === -1) {
          return { success: false };
        }
        if (notes[index].authorId !== user.id) {
          throw new Error("Access denied");
        }
        notes.splice(index, 1);
        return { success: true };
      },
    },
    search: {
      description: "Search notes by title or content",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async ({ query }, user) => {
        if (!user) throw new Error("Authentication required");
        return notes.filter(
          (note) =>
            note.authorId === user.id &&
            (note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase()))
        );
      },
    },
  },
});