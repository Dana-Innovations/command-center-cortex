import { NextRequest, NextResponse } from "next/server";
import type { AttentionProvider, FocusNode, ImportanceTier } from "@/lib/attention/types";
import { buildFocusLookup, buildFocusPreferenceKey, buildProviderFocusKey } from "@/lib/attention/utils";
import { loadAttentionProfile } from "@/lib/attention/server";
import { getConnections } from "@/lib/cortex/connections";
import { callCortexMCP, getCortexToken } from "@/lib/cortex/client";
import { getCortexUserFromRequest } from "@/lib/cortex/user";

function resolveNodeImportance(
  provider: AttentionProvider,
  entityType: string,
  entityId: string,
  lookup: Map<string, { importance: ImportanceTier }>,
  fallback: ImportanceTier
) {
  const direct = lookup.get(buildFocusPreferenceKey(provider, entityType, entityId));
  if (direct) return { importance: direct.importance, inherited: direct.importance };

  const providerValue = lookup.get(buildProviderFocusKey(provider));
  const inherited = providerValue?.importance ?? fallback;
  return { importance: inherited, inherited };
}

function providerNode(
  provider: AttentionProvider,
  label: string,
  description: string,
  connected: boolean,
  lookup: Map<string, { importance: ImportanceTier }>
): FocusNode {
  const importance = lookup.get(buildProviderFocusKey(provider))?.importance ?? "normal";
  return {
    id: buildProviderFocusKey(provider),
    provider,
    entityType: "provider",
    entityId: provider,
    label,
    description,
    importance,
    inheritedImportance: importance,
    connected,
    children: [],
  };
}

function sortNodes(nodes: FocusNode[]) {
  return nodes.sort((a, b) => a.label.localeCompare(b.label));
}

export async function GET(request: NextRequest) {
  const user = getCortexUserFromRequest(request);
  const token = getCortexToken(request);
  if (!user || !token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const profile = await loadAttentionProfile(user.sub);
    const lookup = buildFocusLookup(profile.focusPreferences);
    const connections = await getConnections(token);
    const has = (name: string) =>
      connections.some(
        (connection) =>
          (connection.mcp_name === name || connection.provider === name) &&
          connection.connected
      );

    const url = new URL(request.url);
    const providerParam = url.searchParams.get("provider");
    const teamId = url.searchParams.get("teamId");
    const query = url.searchParams.get("query")?.toLowerCase().trim() ?? "";

    const providers: FocusNode[] = [];

    if (!providerParam || providerParam === "outlook_mail") {
      const node = providerNode(
        "outlook_mail",
        "Outlook Mail",
        "Folders and inbox areas that shape email surfacing.",
        has("m365") || has("microsoft"),
        lookup
      );

      if (node.connected) {
        const foldersResult = (await callCortexMCP(
          "m365",
          "list_mail_folders",
          {},
          token
        )) as { folders?: Array<Record<string, unknown>> } | null;

        const mailRootId = buildFocusPreferenceKey("outlook_mail", "mail_root", "mail");
        const mailRootImportance =
          lookup.get(mailRootId)?.importance ?? node.importance;

        const root: FocusNode = {
          id: mailRootId,
          provider: "outlook_mail",
          entityType: "mail_root",
          entityId: "mail",
          parentId: node.id,
          label: "Mail",
          importance: mailRootImportance,
          inheritedImportance: node.importance,
          connected: true,
          counts: { children: foldersResult?.folders?.length ?? 0 },
          children: [],
        };

        const folderNodes = (foldersResult?.folders ?? [])
          .map((folder) => {
            const folderId = String(folder.id ?? "");
            const label = String(folder.displayName ?? "Folder");
            if (!folderId || (query && !label.toLowerCase().includes(query))) {
              return null;
            }
            const importance = resolveNodeImportance(
              "outlook_mail",
              "mail_folder",
              folderId,
              lookup,
              root.importance
            );
            return {
              id: buildFocusPreferenceKey("outlook_mail", "mail_folder", folderId),
              provider: "outlook_mail" as const,
              entityType: "mail_folder" as const,
              entityId: folderId,
              parentId:
                typeof folder.parentFolderId === "string"
                  ? buildFocusPreferenceKey("outlook_mail", "mail_folder", folder.parentFolderId)
                  : root.id,
              label,
              importance: importance.importance,
              inheritedImportance: importance.inherited,
              connected: true,
              counts: {
                total: Number(folder.totalItemCount ?? 0),
                unread: Number(folder.unreadItemCount ?? 0),
                children: Number(folder.childFolderCount ?? 0),
              },
              metadata: {
                displayName: label,
                parentFolderId:
                  typeof folder.parentFolderId === "string" ? folder.parentFolderId : null,
              },
            } satisfies FocusNode;
          })
          .filter(Boolean) as FocusNode[];

        const byId = new Map(folderNodes.map((entry) => [entry.id, { ...entry, children: [] as FocusNode[] }]));
        for (const child of byId.values()) {
          const parent = child.parentId ? byId.get(child.parentId) : null;
          if (parent) {
            parent.children = sortNodes([...(parent.children ?? []), child]);
          } else {
            root.children = sortNodes([...(root.children ?? []), child]);
          }
        }

        node.children = [root];
      }

      providers.push(node);
    }

    if (!providerParam || providerParam === "outlook_calendar") {
      const node = providerNode(
        "outlook_calendar",
        "Outlook Calendar",
        "Primary calendar attention weighting.",
        has("m365") || has("microsoft"),
        lookup
      );

      if (node.connected) {
        const rootId = buildFocusPreferenceKey("outlook_calendar", "calendar_root", "calendar");
        const calendarId = buildFocusPreferenceKey("outlook_calendar", "calendar", "primary");
        const rootImportance = lookup.get(rootId)?.importance ?? node.importance;
        const calendarImportance = lookup.get(calendarId)?.importance ?? rootImportance;

        node.children = [
          {
            id: rootId,
            provider: "outlook_calendar",
            entityType: "calendar_root",
            entityId: "calendar",
            parentId: node.id,
            label: "Calendars",
            importance: rootImportance,
            inheritedImportance: node.importance,
            connected: true,
            children: [
              {
                id: calendarId,
                provider: "outlook_calendar",
                entityType: "calendar",
                entityId: "primary",
                parentId: rootId,
                label: "Primary Calendar",
                description: "Fallback node until multi-calendar inventory is available.",
                importance: calendarImportance,
                inheritedImportance: rootImportance,
                connected: true,
              },
            ],
          },
        ];
      }

      providers.push(node);
    }

    if (!providerParam || providerParam === "asana") {
      const node = providerNode(
        "asana",
        "Asana",
        "Projects and boards that shape tasks and comments.",
        has("asana"),
        lookup
      );

      if (node.connected) {
        const projectsResult = (await callCortexMCP(
          "asana",
          "list_projects",
          {},
          token
        )) as { projects?: Array<Record<string, unknown>> } | null;

        node.children = sortNodes(
          (projectsResult?.projects ?? [])
            .map((project) => {
              const gid = String(project.gid ?? project.id ?? "");
              const label = String(project.name ?? "Project");
              if (!gid || (query && !label.toLowerCase().includes(query))) return null;
              const importance = resolveNodeImportance(
                "asana",
                "asana_project",
                gid,
                lookup,
                node.importance
              );
              return {
                id: buildFocusPreferenceKey("asana", "asana_project", gid),
                provider: "asana" as const,
                entityType: "asana_project" as const,
                entityId: gid,
                parentId: node.id,
                label,
                importance: importance.importance,
                inheritedImportance: importance.inherited,
                connected: true,
                metadata: {
                  archived: Boolean(project.archived),
                },
              } satisfies FocusNode;
            })
            .filter(Boolean) as FocusNode[]
        );
      }

      providers.push(node);
    }

    if (!providerParam || providerParam === "teams") {
      const node = providerNode(
        "teams",
        "Teams",
        "Teams, channels, and channel message surfacing.",
        has("m365") || has("microsoft"),
        lookup
      );

      if (node.connected) {
        const teamsResult = (await callCortexMCP(
          "m365",
          "list_teams",
          {},
          token
        )) as { teams?: Array<Record<string, unknown>> } | null;

        const teamNodes = (teamsResult?.teams ?? [])
          .map((team) => {
            const id = String(team.id ?? "");
            const label = String(team.displayName ?? "Team");
            if (!id || (query && !label.toLowerCase().includes(query))) return null;
            const importance = resolveNodeImportance(
              "teams",
              "teams_team",
              id,
              lookup,
              node.importance
            );
            return {
              id: buildFocusPreferenceKey("teams", "teams_team", id),
              provider: "teams" as const,
              entityType: "teams_team" as const,
              entityId: id,
              parentId: node.id,
              label,
              description:
                typeof team.description === "string" ? team.description : undefined,
              importance: importance.importance,
              inheritedImportance: importance.inherited,
              connected: true,
              lazy: true,
              children: [],
            } satisfies FocusNode;
          })
          .filter(Boolean) as FocusNode[];

        if (teamId) {
          const channelsResult = (await callCortexMCP(
            "m365",
            "list_channels",
            { team_id: teamId },
            token
          )) as { channels?: Array<Record<string, unknown>> } | null;

          const targetTeam = teamNodes.find((entry) => entry.entityId === teamId);
          if (targetTeam) {
            targetTeam.lazy = false;
            targetTeam.children = sortNodes(
              (channelsResult?.channels ?? [])
                .map((channel) => {
                  const id = String(channel.id ?? "");
                  const label = String(channel.displayName ?? "Channel");
                  if (!id || (query && !label.toLowerCase().includes(query))) return null;
                  const importance = resolveNodeImportance(
                    "teams",
                    "teams_channel",
                    id,
                    lookup,
                    targetTeam.importance
                  );
                  return {
                    id: buildFocusPreferenceKey("teams", "teams_channel", id),
                    provider: "teams" as const,
                    entityType: "teams_channel" as const,
                    entityId: id,
                    parentId: targetTeam.id,
                    label,
                    description:
                      typeof channel.membershipType === "string"
                        ? channel.membershipType
                        : undefined,
                    importance: importance.importance,
                    inheritedImportance: importance.inherited,
                    connected: true,
                    metadata: {
                      teamId,
                      webUrl:
                        typeof channel.webUrl === "string" ? channel.webUrl : null,
                    },
                  } satisfies FocusNode;
                })
                .filter(Boolean) as FocusNode[]
            );
          }
        }

        node.children = sortNodes(teamNodes);
      }

      providers.push(node);
    }

    if (!providerParam || providerParam === "slack") {
      const node = providerNode(
        "slack",
        "Slack",
        "Channels that shape signal and context surfacing.",
        has("slack"),
        lookup
      );

      if (node.connected) {
        const channelsResult = (await callCortexMCP(
          "slack",
          "list_channels",
          { limit: 200, types: "public_channel,private_channel" },
          token
        )) as { channels?: Array<Record<string, unknown>> } | null;

        node.children = sortNodes(
          (channelsResult?.channels ?? [])
            .filter((channel) => {
              const name = String(channel.name ?? "").toLowerCase();
              const type = String(channel.type ?? "");
              if (type === "group_dm" || type === "im") return false;
              if (name.startsWith("mpdm-")) return false;
              if (query && !name.includes(query)) return false;
              return true;
            })
            .map((channel) => {
              const id = String(channel.id ?? "");
              const label = String(channel.name ?? "channel");
              const importance = resolveNodeImportance(
                "slack",
                "slack_channel",
                id,
                lookup,
                node.importance
              );
              return {
                id: buildFocusPreferenceKey("slack", "slack_channel", id),
                provider: "slack" as const,
                entityType: "slack_channel" as const,
                entityId: id,
                parentId: node.id,
                label: `#${label}`,
                description:
                  typeof channel.topic === "string" ? channel.topic : undefined,
                importance: importance.importance,
                inheritedImportance: importance.inherited,
                connected: true,
                metadata: {
                  channelName: label,
                  isPrivate: Boolean(channel.is_private),
                  type: typeof channel.type === "string" ? channel.type : "internal",
                },
              } satisfies FocusNode;
            })
        );
      }

      providers.push(node);
    }

    return NextResponse.json({
      providers,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build focus map" },
      { status: 500 }
    );
  }
}
