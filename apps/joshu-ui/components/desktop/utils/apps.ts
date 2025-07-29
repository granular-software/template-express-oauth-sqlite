import { Calendar, Globe, ListFilter, ListTodo, Network, Notebook, Search, Workflow } from "lucide-react";

export const apps = [
    {
        name: 'Notes',
        path: "app_notes_application",
        icon: Notebook,
        color: 'text-yellow-600',
    },
    {
        name: 'Finder',
        path: "app_finder_application",
        icon: Search,
        color: 'text-blue-600',
    },
    {
        name: 'Tables',
        path: "app_tables_application",
        icon: ListFilter,
        color: 'text-purple-600',
    },
    {
        name: 'Agenda',
        path: "app_agenda_application",
        icon: Calendar,
        color: 'text-red-600',
    },
    {
        name: 'Browser',
        path: "app_browser_application",
        icon: Globe,
        color: 'text-cyan-600',
    },
    {
        name: 'Automations',
        path: "app_automations_application",
        icon: Workflow,
        color: 'text-orange-600',
    },
    {
        name: 'MindMaps',
        path: "app_mindmaps_application",
        icon: Network,
        color: 'text-indigo-600',
    },
    {
        name: 'Planner',
        path: "app_planner_application",
        icon: ListTodo,
        color: 'text-green-600',
    },
];