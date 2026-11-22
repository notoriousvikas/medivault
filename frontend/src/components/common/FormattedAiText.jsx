import React from 'react';

/**
 * Parses inline markdown: **bold**, *italic*, `code`
 */
function renderInline(text) {
  if (!text) return null;

  // Split on **bold**, *italic*, or `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-extrabold text-navy-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic font-semibold text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Formats multi-line AI responses with markdown headings, bullet points, and inline bold/italic.
 */
export default function FormattedAiText({ text, className = '' }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-2 my-2.5 pl-1">
          {currentList.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-trust-500 mt-2 shrink-0" />
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Empty lines act as separators
    if (!trimmed) {
      flushList();
      return;
    }

    // Bullet points: "- ", "* ", or numbered "1. "
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }

    if (numMatch) {
      flushList();
      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed my-1.5 pl-1">
          <span className="font-bold text-trust-600 shrink-0 text-xs mt-0.5">{numMatch[1]}.</span>
          <span className="flex-1">{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Otherwise flush active bullet list
    flushList();

    // Section title / header: starts with "### " or is wrapped in "**...**"
    const isMarkdownHeader = trimmed.startsWith('#');
    const isBoldHeaderLine = /^(\*\*[^*]+:\*\*|\*\*[^*]+\*\*)$/.test(trimmed);

    if (isMarkdownHeader || isBoldHeaderLine) {
      const cleanTitle = trimmed
        .replace(/^#+\s*/, '')
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '');

      elements.push(
        <h4
          key={`h-${idx}`}
          className="font-bold text-xs sm:text-sm text-navy-900 mt-3.5 mb-1.5 uppercase tracking-wider text-trust-800"
        >
          {cleanTitle}
        </h4>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-2">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 text-slate-700 ${className}`}>{elements}</div>;
}
