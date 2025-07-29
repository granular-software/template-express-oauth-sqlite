"use client";

import { useState, useEffect, useCallback } from "react";
import type { Role, PermissionEntry } from "../lib/types";
import { listRoles as dbList, createRole as dbCreate, updateRole as dbUpdate, deleteRole as dbDelete, setPermission as dbSetPerm, removePermission as dbRemovePerm } from "../lib/mock-db";

interface UseRolesResult {
	roles: Role[];
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	createRole: (data: { name: string; permissions?: PermissionEntry[] }) => Promise<Role>;
	updateRole: (roleId: string, data: Partial<Omit<Role, "id" | "workspaceId">>) => Promise<Role | undefined>;
	deleteRole: (roleId: string) => Promise<boolean>;
	setPermission: (roleId: string, entry: PermissionEntry) => void;
	removePermission: (roleId: string, serverId: string, resourceId: string) => void;
}

export function useRoles(workspaceId: string | undefined): UseRolesResult {
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!workspaceId) return;
		try {
			setLoading(true);
			const data = await Promise.resolve(dbList(workspaceId));
			setRoles(data);
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to fetch roles");
		} finally {
			setLoading(false);
		}
	}, [workspaceId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// CRUD
	const createRole = async (data: { name: string; permissions?: PermissionEntry[] }) => {
		if (!workspaceId) throw new Error("workspaceId is required");
		const role = await Promise.resolve(dbCreate(workspaceId, { ...data, permissions: data.permissions ?? [], agentIds: [] }));
		setRoles((prev) => [...prev, role]);
		return role;
	};

	const updateRole = async (roleId: string, data: Partial<Omit<Role, "id" | "workspaceId">>) => {
		const updated = await Promise.resolve(dbUpdate(roleId, data));
		if (updated) setRoles((prev) => prev.map((r) => (r.id === roleId ? updated : r)));
		return updated;
	};

	const deleteRole = async (roleId: string) => {
		const removed = await Promise.resolve(dbDelete(roleId));
		if (removed) setRoles((prev) => prev.filter((r) => r.id !== roleId));
		return removed;
	};

	const setPermission = (roleId: string, entry: PermissionEntry) => {
		dbSetPerm({ type: "role", id: roleId }, entry);
		refresh();
	};

	const removePermission = (roleId: string, serverId: string, resourceId: string) => {
		dbRemovePerm({ type: "role", id: roleId }, serverId, resourceId);
		refresh();
	};

	return {
		roles,
		loading,
		error,
		refresh,
		createRole,
		updateRole,
		deleteRole,
		setPermission,
		removePermission,
	};
}
