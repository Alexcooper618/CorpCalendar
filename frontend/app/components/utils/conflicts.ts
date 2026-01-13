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
  targetKeys: string[],
  audienceDescendants: AudienceDescendants
) => {
  if (!targetKeys.length) return false;
  if (audienceKey === ALL_EMPLOYEES_ID) return true;

  const eventDescendants = audienceDescendants.map.get(audienceKey);

  for (const targetKey of targetKeys) {
    if (targetKey === ALL_EMPLOYEES_ID) return true;
    if (targetKey === audienceKey) return true;

    const targetDescendants = audienceDescendants.map.get(targetKey);
    if (targetDescendants?.has(audienceKey)) return true;
    if (eventDescendants?.has(targetKey)) return true;
  }

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

    eventAudiences.forEach((audienceKey) => {
      if (!audiencesOverlap(audienceKey, targetAudienceKeys, audienceDescendants)) {
        return;
      }
      const label = resolveAudienceLabel(audienceKey, audienceLookup);
      const existing = conflicts.get(audienceKey);
      if (existing) {
        existing.events.push(event);
      } else {
        conflicts.set(audienceKey, { label, events: [event] });
      }
    });
  });

  return Array.from(conflicts.entries()).map(([key, value]) => ({
    key,
    ...value,
  }));
};
