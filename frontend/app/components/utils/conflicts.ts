import { AudienceNode, Event, Product } from "../Calendar";

const ALL_EMPLOYEES_ID = "all-employees";

type AudienceDescendants = {
  map: Map<string, Set<string>>;
  allIds: Set<string>;
};

export type AudienceConflictGroup = {
  key: string;
  label: string;
  events: Event[];
};

export type AudienceOverlapGroup = {
  key: string;
  label: string;
  totalEvents: number;
  overlapPairs: number;
  overlappingEvents: Event[];
};

export type AudienceLoadEntry = {
  key: string;
  label: string;
  totalEvents: number;
};

export type AudienceOverlapReport = {
  totalEvents: number;
  totalOverlapGroups: number;
  totalOverlappingEvents: number;
  overlapGroups: AudienceOverlapGroup[];
  loadRanking: AudienceLoadEntry[];
};

export const buildAudienceDescendants = (
  audienceTree: AudienceNode[]
): AudienceDescendants => {
  const map = new Map<string, Set<string>>();
  const allIds = new Set<string>();
  const walk = (node: AudienceNode) => {
    const ids = new Set<string>([node.id]);
    allIds.add(node.id);
    node.children?.forEach((child) => {
      const childIds = walk(child);
      childIds.forEach((id) => ids.add(id));
    });
    map.set(node.id, ids);
    return ids;
  };
  audienceTree.forEach(walk);
  return { map, allIds };
};

export const expandAudienceKey = (
  key: string,
  audienceDescendants: AudienceDescendants
): Set<string> => {
  if (key === ALL_EMPLOYEES_ID) {
    return new Set(audienceDescendants.allIds);
  }
  return new Set([key]);
};

export const buildAudienceSetFromKeys = (
  keys: string[],
  audienceDescendants: AudienceDescendants
) => {
  const expanded = new Set<string>();
  keys.forEach((key) => {
    expandAudienceKey(key, audienceDescendants).forEach((id) => expanded.add(id));
  });
  return expanded;
};

const parseEventDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA <= endB && endA >= startB;

const audiencesOverlap = (
  audienceKey: string,
  targetKey: string,
  audienceDescendants: AudienceDescendants
) => {
  if (audienceKey === ALL_EMPLOYEES_ID) return true;
  if (targetKey === ALL_EMPLOYEES_ID) return true;
  if (targetKey === audienceKey) return true;

  const targetDescendants = audienceDescendants.map.get(targetKey);
  if (targetDescendants?.has(audienceKey)) return true;

  const eventDescendants = audienceDescendants.map.get(audienceKey);
  if (eventDescendants?.has(targetKey)) return true;

  return false;
};

const resolveAudienceLabel = (audienceKey: string, audienceLookup: Map<string, string>) => {
  const label = audienceLookup.get(audienceKey);
  if (typeof label === "string" && label.trim()) {
    return label;
  }
  if (label) {
    return String(label);
  }
  return audienceKey;
};

const resolveEventAudiences = (event: Event, product?: Product) => {
  if (event.type === "itProduct") {
    if (product?.audienceIds?.length) {
      return product.audienceIds;
    }
    if (product?.audienceId) {
      return [product.audienceId];
    }
    return [];
  }

  const deptValue = event.dept?.trim();
  return deptValue ? [deptValue] : [];
};

type GetAudienceConflictsParams = {
  events: Event[];
  products: Product[];
  audienceLookup: Map<string, string>;
  audienceDescendants: AudienceDescendants;
  range: { start: Date; end: Date };
  targetAudienceKeys: string[];
  excludeEventId?: string;
};

export const getAudienceConflicts = ({
  events,
  products,
  audienceLookup,
  audienceDescendants,
  range,
  targetAudienceKeys,
  excludeEventId,
}: GetAudienceConflictsParams): AudienceConflictGroup[] => {
  if (!targetAudienceKeys.length) return [];

  const conflicts = new Map<string, { label: string; events: Event[] }>();

  events.forEach((event) => {
    if (excludeEventId && event.id === excludeEventId) {
      return;
    }

    const eventStart = parseEventDate(event.startDate);
    const eventEnd = parseEventDate(event.endDate);
    if (!eventStart || !eventEnd) return;
    if (!rangesOverlap(range.start, range.end, eventStart, eventEnd)) {
      return;
    }

    const eventProduct = event.productId
      ? products.find((product) => product.id === event.productId)
      : undefined;
    const eventAudiences = resolveEventAudiences(event, eventProduct);
    if (!eventAudiences.length) return;

    targetAudienceKeys.forEach((targetKey) => {
      const matchesTarget = eventAudiences.some((audienceKey) =>
        audiencesOverlap(audienceKey, targetKey, audienceDescendants)
      );
      if (!matchesTarget) {
        return;
      }
      const label = resolveAudienceLabel(targetKey, audienceLookup);
      const existing = conflicts.get(targetKey);
      if (existing) {
        existing.events.push(event);
      } else {
        conflicts.set(targetKey, { label, events: [event] });
      }
    });
  });

  return Array.from(conflicts.entries()).map(([key, value]) => ({
    key,
    ...value,
  }));
};

type GetAudienceOverlapReportParams = {
  events: Event[];
  products: Product[];
  audienceLookup: Map<string, string>;
  audienceDescendants: AudienceDescendants;
  range: { start: Date; end: Date };
};

export const getAudienceOverlapReport = ({
  events,
  products,
  audienceLookup,
  audienceDescendants,
  range,
}: GetAudienceOverlapReportParams): AudienceOverlapReport => {
  const eventEntries = events.flatMap((event) => {
    const eventStart = parseEventDate(event.startDate);
    const eventEnd = parseEventDate(event.endDate);
    if (!eventStart || !eventEnd) return [];
    if (!rangesOverlap(range.start, range.end, eventStart, eventEnd)) {
      return [];
    }

    const eventProduct = event.productId
      ? products.find((product) => product.id === event.productId)
      : undefined;
    const eventAudiences = resolveEventAudiences(event, eventProduct);
    const expandedAudiences = buildAudienceSetFromKeys(
      eventAudiences,
      audienceDescendants
    );

    return [
      {
        event,
        start: eventStart,
        end: eventEnd,
        audienceIds: expandedAudiences,
      },
    ];
  });

  const totalEvents = eventEntries.length;
  const audienceEventMap = new Map<string, typeof eventEntries>();

  eventEntries.forEach((entry) => {
    entry.audienceIds.forEach((audienceId) => {
      const list = audienceEventMap.get(audienceId);
      if (list) {
        list.push(entry);
      } else {
        audienceEventMap.set(audienceId, [entry]);
      }
    });
  });

  const loadRanking = Array.from(audienceEventMap.entries())
    .filter(([key]) => key !== ALL_EMPLOYEES_ID)
    .map(([key, list]) => ({
      key,
      label: resolveAudienceLabel(key, audienceLookup),
      totalEvents: list.length,
    }))
    .sort((a, b) => {
      if (b.totalEvents !== a.totalEvents) {
        return b.totalEvents - a.totalEvents;
      }
      return a.label.localeCompare(b.label, "ru");
    });

  const overlapGroups: AudienceOverlapGroup[] = [];
  const overlappingEventIds = new Set<string>();

  audienceEventMap.forEach((entries, audienceId) => {
    if (entries.length < 2) return;
    let overlapPairs = 0;
    const localOverlaps = new Set<string>();

    for (let i = 0; i < entries.length; i += 1) {
      const current = entries[i];
      for (let j = i + 1; j < entries.length; j += 1) {
        const candidate = entries[j];
        if (rangesOverlap(current.start, current.end, candidate.start, candidate.end)) {
          overlapPairs += 1;
          localOverlaps.add(current.event.id);
          localOverlaps.add(candidate.event.id);
        }
      }
    }

    if (!overlapPairs) return;

    localOverlaps.forEach((id) => overlappingEventIds.add(id));

    const overlappingEvents = entries
      .filter((entry) => localOverlaps.has(entry.event.id))
      .map((entry) => entry.event);

    overlapGroups.push({
      key: audienceId,
      label: resolveAudienceLabel(audienceId, audienceLookup),
      totalEvents: entries.length,
      overlapPairs,
      overlappingEvents,
    });
  });

  overlapGroups.sort((a, b) => {
    if (b.overlapPairs !== a.overlapPairs) {
      return b.overlapPairs - a.overlapPairs;
    }
    if (b.totalEvents !== a.totalEvents) {
      return b.totalEvents - a.totalEvents;
    }
    return a.label.localeCompare(b.label, "ru");
  });

  return {
    totalEvents,
    totalOverlapGroups: overlapGroups.length,
    totalOverlappingEvents: overlappingEventIds.size,
    overlapGroups,
    loadRanking,
  };
};
