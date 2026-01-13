"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AudienceNode } from "./Calendar";

const filterAudienceTree = (nodes: AudienceNode[], query: string): AudienceNode[] => {
  if (!query.trim()) return nodes;
  const lowered = query.trim().toLowerCase();
  return nodes.flatMap((node) => {
    const matches = node.name.toLowerCase().includes(lowered);
    const filteredChildren = node.children
      ? filterAudienceTree(node.children, query)
      : [];
    if (matches || filteredChildren.length) {
      return [{ ...node, children: filteredChildren }];
    }
    return [];
  });
};

type AudiencePickerModalProps = {
  isOpen: boolean;
  audienceTree: AudienceNode[];
  selectedAudienceId: string;
  onApply: (audienceId: string) => void;
  onClose: () => void;
};

export const AudiencePickerModal = ({
  isOpen,
  audienceTree,
  selectedAudienceId,
  onApply,
  onClose,
}: AudiencePickerModalProps) => {
  const [audienceQuery, setAudienceQuery] = useState("");
  const [expandedAudienceIds, setExpandedAudienceIds] = useState<Set<string>>(
    new Set()
  );
  const [draftAudienceId, setDraftAudienceId] = useState(selectedAudienceId);

  useEffect(() => {
    if (!isOpen) return;
    setDraftAudienceId(selectedAudienceId);
    setAudienceQuery("");
    setExpandedAudienceIds(new Set());
  }, [isOpen, selectedAudienceId]);

  const filteredAudienceTree = useMemo(
    () => filterAudienceTree(audienceTree, audienceQuery),
    [audienceQuery, audienceTree]
  );

  const toggleAudienceExpanded = (audienceId: string) => {
    setExpandedAudienceIds((prev) => {
      const next = new Set(prev);
      if (next.has(audienceId)) {
        next.delete(audienceId);
      } else {
        next.add(audienceId);
      }
      return next;
    });
  };

  const effectiveExpandedAudienceIds = useMemo(() => {
    if (!audienceQuery.trim()) {
      return expandedAudienceIds;
    }
    const autoExpanded = new Set<string>();
    const walk = (nodes: AudienceNode[]) => {
      nodes.forEach((node) => {
        if (node.children?.length) {
          autoExpanded.add(node.id);
          walk(node.children);
        }
      });
    };
    walk(filteredAudienceTree);
    return autoExpanded;
  }, [audienceQuery, expandedAudienceIds, filteredAudienceTree]);

  const handleAudienceSelect = (node: AudienceNode) => {
    setDraftAudienceId((prev) => (prev === node.id ? "" : node.id));
  };

  const renderAudienceNode = (node: AudienceNode, depth = 0) => {
    const isExpanded = effectiveExpandedAudienceIds.has(node.id);
    const isSelected = draftAudienceId === node.id;
    const hasChildren = Boolean(node.children && node.children.length);

    return (
      <li key={node.id}>
        <div
          className="flex items-center gap-2 text-sm text-slate-700"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleAudienceExpanded(node.id)}
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
              aria-label={isExpanded ? "Свернуть группу" : "Развернуть группу"}
            >
              {isExpanded ? "−" : "+"}
            </button>
          ) : (
            <span className="inline-flex h-5 w-5" />
          )}
          <button
            type="button"
            onClick={() => handleAudienceSelect(node)}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 transition"
            aria-pressed={isSelected}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isSelected ? "bg-emerald-500" : "bg-transparent"
              }`}
            />
          </button>
          <span>{node.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <ul className="mt-1 space-y-1">
            {node.children?.map((child) => renderAudienceNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Аудитория из справочника</p>
            <h4 className="text-lg font-semibold text-slate-800">
              Выбор аудитории
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Поиск аудитории</span>
          <input
            value={audienceQuery}
            onChange={(e) => setAudienceQuery(e.target.value)}
            placeholder="Введите часть названия"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </label>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[70vh] overflow-auto rounded-md border border-slate-200 p-3">
            {filteredAudienceTree.length ? (
              <ul className="space-y-1">
                {filteredAudienceTree.map((node) => renderAudienceNode(node))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Ничего не найдено по запросу.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border"
          >
            Отменить
          </button>
          <button
            type="button"
            onClick={() => onApply(draftAudienceId)}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
