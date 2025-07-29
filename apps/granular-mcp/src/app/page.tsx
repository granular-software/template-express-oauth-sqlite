"use client"

import { PageLayout } from "@/components/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useWorkspaces } from "@/hooks/use-workspaces";

export default function Home() {
  const { workspaces, loading } = useWorkspaces();

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <Link href="/workspaces/new" className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
            <Plus className="h-4 w-4" /> Create Workspace
          </Link>
        </div>

        {/* Workspaces Grid */}
        {loading ? (
          <p className="text-muted-foreground">Loading workspaces...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-muted-foreground">No workspaces found. Create your first one!</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Card key={ws.path} className="hover:shadow-lg transition-shadow group">
                <Link href={`/workspaces/${ws.path}`}>
                  <CardHeader className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-blue-400 transition-colors truncate max-w-[180px]">
                        {ws.label || "Unnamed Workspace"}
                      </CardTitle>
                      <CardDescription className="text-xs truncate max-w-[180px]">{ws.path}</CardDescription>
                    </div>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
