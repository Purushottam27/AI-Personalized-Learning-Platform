import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Code2,
  Eye,
  EyeOff,
  Heading2,
  Lightbulb,
  List,
  ListOrdered,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import Button from "../../../../components/ui/Button";
import {
  createLesson,
  deleteLesson,
  reorderTopicLessons,
  updateLesson,
} from "../../api/lesson.api";
import { useTopicLessons } from "../../hooks/useTopicLessons";
import { isApiError } from "../../../../lib/axios";
import type { CourseStatus } from "../../types/instructor.types";
import type {
  Lesson,
  LessonCalloutVariant,
  LessonContentBlock,
  LessonListStyle,
  LessonPayload,
} from "../../types/lesson.types";

interface LessonManagementProps {
  topicId: string;
  topicTitle: string;
  courseStatus: CourseStatus;
}

interface LessonFormState {
  title: string;
  description: string;
  markdown: string;
}

type PreservedMediaBlock = Extract<
  LessonContentBlock,
  { type: "IMAGE" | "VIDEO" }
>;
type MediaMap = Record<string, PreservedMediaBlock>;

const EMPTY_FORM: LessonFormState = {
  title: "",
  description: "",
  markdown: "",
};
const interactive =
  "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none";
const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25";

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  )
    return error.message;
  return "Something went wrong. Please try again.";
}

function mediaMarker(block: PreservedMediaBlock, index: number): string {
  return block.type === "IMAGE"
    ? `[[Existing image #${index}]]`
    : `[[Existing video #${index}]]`;
}

function serializeLessonContent(content: LessonContentBlock[]): {
  markdown: string;
  media: MediaMap;
} {
  const media: MediaMap = {};
  let mediaIndex = 0;
  const chunks = content.map((block) => {
    switch (block.type) {
      case "TEXT":
        return block.content;
      case "HEADING":
        return `${block.level === 3 ? "###" : "##"} ${block.content}`;
      case "CODE":
        return `\`\`\`${block.language || "text"}\n${block.content}\n\`\`\``;
      case "CALLOUT":
        return `> [!${block.variant}]\n${block.content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}`;
      case "LIST":
        return block.items
          .map((item, index) =>
            block.style === "NUMBERED" ? `${index + 1}. ${item}` : `- ${item}`,
          )
          .join("\n");
      case "IMAGE":
      case "VIDEO": {
        mediaIndex += 1;
        const marker = mediaMarker(block, mediaIndex);
        media[marker] = block;
        return marker;
      }
    }
  });
  return { markdown: chunks.join("\n\n").trim(), media };
}

function parseMarkdown(
  markdown: string,
  preservedMedia: MediaMap,
): LessonContentBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: LessonContentBlock[] = [];
  let index = 0;

  const isSpecialStart = (line: string) => {
    const value = line.trim();
    return (
      /^```/.test(value) ||
      /^#{1,3}\s+/.test(value) ||
      /^[-*+]\s+/.test(value) ||
      /^\d+[.)]\s+/.test(value) ||
      /^>\s*\[!(INFO|TIP|WARNING|IMPORTANT)\]/i.test(value) ||
      /^\[\[Existing (image|video) #\d+\]\]$/.test(value) ||
      /^@\[video:\s*.+?\]\(https?:\/\/[^\s)]+\)$/i.test(value)
    );
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const mediaBlock = preservedMedia[trimmed];
    if (mediaBlock) {
      blocks.push(mediaBlock);
      index += 1;
      continue;
    }

    const videoSyntax = trimmed.match(
      /^@\[video:\s*(.+?)\]\((https?:\/\/[^\s)]+)\)$/i,
    );
    if (videoSyntax) {
      blocks.push({
        type: "VIDEO",
        title: videoSyntax[1].trim(),
        url: videoSyntax[2],
      });
      index += 1;
      continue;
    }

    const codeStart = trimmed.match(/^```\s*([\w#+.-]*)\s*$/);
    if (codeStart) {
      const language = codeStart[1] || "text";
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const code = codeLines.join("\n");
      if (code.trim())
        blocks.push({
          type: "CODE",
          language: language.slice(0, 50),
          content: code,
        });
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level: 2 | 3 = heading[1].length >= 3 ? 3 : 2;
      blocks.push({ type: "HEADING", level, content: heading[2].trim() });
      index += 1;
      continue;
    }

    const calloutStart = trimmed.match(
      /^>\s*\[!(INFO|TIP|WARNING|IMPORTANT)\]\s*$/i,
    );
    if (calloutStart) {
      const variant = calloutStart[1].toUpperCase() as LessonCalloutVariant;
      index += 1;
      const calloutLines: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        calloutLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      const content = calloutLines.join("\n").trim();
      if (content) blocks.push({ type: "CALLOUT", variant, content });
      continue;
    }

    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const style: LessonListStyle = bullet ? "BULLETED" : "NUMBERED";
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        const itemMatch =
          style === "BULLETED"
            ? itemLine.match(/^[-*+]\s+(.+)$/)
            : itemLine.match(/^\d+[.)]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        index += 1;
      }
      if (items.length) blocks.push({ type: "LIST", style, items });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isSpecialStart(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    const paragraph = paragraphLines.join("\n").trim();
    if (paragraph) blocks.push({ type: "TEXT", content: paragraph });
  }

  return blocks;
}

function validateLesson(
  titleValue: string,
  descriptionValue: string,
  blocks: LessonContentBlock[],
): string | null {
  const title = titleValue.trim();
  if (title.length < 4 || title.length > 150)
    return "Lesson title must be between 4 and 150 characters.";
  if (descriptionValue.trim().length > 500)
    return "Description cannot exceed 500 characters.";
  if (blocks.length < 1 || blocks.length > 100)
    return "Add lesson content. A lesson must contain between 1 and 100 content blocks.";

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const prefix = `Content block ${index + 1}: `;
    switch (block.type) {
      case "TEXT":
        if (!block.content.trim() || block.content.length > 20000)
          return `${prefix}text is required and must be under 20,000 characters.`;
        break;
      case "HEADING":
        if (!block.content.trim() || block.content.trim().length > 200)
          return `${prefix}heading must be 1–200 characters.`;
        break;
      case "CODE":
        if (
          !block.language.trim() ||
          block.language.trim().length > 50 ||
          !block.content.trim() ||
          block.content.length > 30000
        )
          return `${prefix}code and a language are required (language up to 50 characters, code up to 30,000).`;
        break;
      case "CALLOUT":
        if (!block.content.trim() || block.content.trim().length > 2000)
          return `${prefix}callout text must be 1–2,000 characters.`;
        break;
      case "LIST":
        if (
          block.items.length < 1 ||
          block.items.length > 50 ||
          block.items.some((item) => !item.trim() || item.trim().length > 500)
        )
          return `${prefix}add 1–50 non-empty list items, each up to 500 characters.`;
        break;
      case "IMAGE":
        if (!block.url || !block.alt.trim())
          return `${prefix}an existing image is incomplete. Keep its marker in the editor to preserve it.`;
        break;
      case "VIDEO":
        if (!block.url || !block.title.trim())
          return `${prefix}an existing video is incomplete. Keep its marker in the editor to preserve it.`;
        break;
    }
  }
  return null;
}

function toPayload(
  title: string,
  description: string,
  content: LessonContentBlock[],
): LessonPayload {
  return {
    title: title.trim(),
    description: description.trim(),
    content: content.map((block) => {
      switch (block.type) {
        case "TEXT":
          return { type: "TEXT", content: block.content.trim() };
        case "HEADING":
          return {
            type: "HEADING",
            level: block.level,
            content: block.content.trim(),
          };
        case "CODE":
          return {
            type: "CODE",
            language: block.language.trim(),
            content: block.content,
          };
        case "CALLOUT":
          return {
            type: "CALLOUT",
            variant: block.variant,
            content: block.content.trim(),
          };
        case "LIST":
          return {
            type: "LIST",
            style: block.style,
            items: block.items.map((item) => item.trim()),
          };
        case "IMAGE":
          return { type: "IMAGE", url: block.url, alt: block.alt.trim() };
        case "VIDEO":
          return { type: "VIDEO", url: block.url, title: block.title.trim() };
      }
    }),
  };
}

const LessonManagement: React.FC<LessonManagementProps> = ({
  topicId,
  topicTitle,
  courseStatus,
}) => {
  const { lessons, setLessons, isLoading, error, refetch } =
    useTopicLessons(topicId);
  const isEditable = courseStatus === "DRAFT";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonFormState>(EMPTY_FORM);
  const [preservedMedia, setPreservedMedia] = useState<MediaMap>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingLessonId, setReorderingLessonId] = useState<string | null>(
    null,
  );
  const [showPreview, setShowPreview] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const markdownRef = useRef<HTMLTextAreaElement | null>(null);

  const parsedBlocks = useMemo(
    () => parseMarkdown(form.markdown, preservedMedia),
    [form.markdown, preservedMedia],
  );

  useEffect(() => {
    if (!isFormOpen) return;
    const frame = window.requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [isFormOpen]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingLessonId(null);
    setForm(EMPTY_FORM);
    setPreservedMedia({});
    setFormError(null);
    setShowPreview(false);
  };

  const openCreateForm = () => {
    setEditingLessonId(null);
    setForm(EMPTY_FORM);
    setPreservedMedia({});
    setFormError(null);
    setActionError(null);
    setShowPreview(false);
    setIsFormOpen(true);
  };

  const openEditForm = (lesson: Lesson) => {
    const serialized = serializeLessonContent(lesson.content);
    setEditingLessonId(lesson._id);
    setForm({
      title: lesson.title,
      description: lesson.description ?? "",
      markdown: serialized.markdown,
    });
    setPreservedMedia(serialized.media);
    setFormError(null);
    setActionError(null);
    setShowPreview(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    resetForm();
  };

  const insertSnippet = (snippet: string) => {
    const textarea = markdownRef.current;
    const start = textarea?.selectionStart ?? form.markdown.length;
    const end = textarea?.selectionEnd ?? form.markdown.length;
    const before = form.markdown.slice(0, start);
    const after = form.markdown.slice(end);
    const needsLeadingBreak =
      before.length > 0 && !before.endsWith("\n\n")
        ? before.endsWith("\n")
          ? "\n"
          : "\n\n"
        : "";
    const cleanSnippet = snippet.trim();
    const needsTrailingBreak =
      after.length > 0 && !after.startsWith("\n\n") ? "\n\n" : "";
    const insertion = `${needsLeadingBreak}${cleanSnippet}${needsTrailingBreak}`;
    const next = `${before}${insertion}${after}`;
    setForm((current) => ({ ...current, markdown: next }));
    setShowPreview(false);
    window.requestAnimationFrame(() => {
      if (!markdownRef.current) return;
      const cursor =
        before.length + needsLeadingBreak.length + cleanSnippet.length;
      markdownRef.current.focus();
      markdownRef.current.setSelectionRange(cursor, cursor);
    });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditable) return;
    const blocks = parseMarkdown(form.markdown, preservedMedia);
    const validation = validateLesson(form.title, form.description, blocks);
    if (validation) {
      setFormError(validation);
      setShowPreview(false);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setActionError(null);
    try {
      const payload = toPayload(form.title, form.description, blocks);
      if (editingLessonId) {
        const updated = await updateLesson(editingLessonId, payload);
        setLessons((current) =>
          current
            .map((lesson) => (lesson._id === updated._id ? updated : lesson))
            .sort((a, b) => a.order - b.order),
        );
      } else {
        const created = await createLesson(topicId, payload);
        setLessons((current) =>
          [...current, created].sort((a, b) => a.order - b.order),
        );
      }
      resetForm();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const moveLesson = async (index: number, direction: -1 | 1) => {
    if (!isEditable || isFormOpen || isSaving || reorderingLessonId) return;
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;
    const reordered = [...lessons];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    setReorderingLessonId(lessons[index]._id);
    setActionError(null);
    try {
      const saved = await reorderTopicLessons(
        topicId,
        reordered.map((lesson) => lesson._id),
      );
      setLessons([...saved].sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    } finally {
      setReorderingLessonId(null);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!isEditable || isSaving || reorderingLessonId || isFormOpen) return;
    if (
      !window.confirm(`Delete “${lesson.title}”? This action cannot be undone.`)
    )
      return;
    setActionError(null);
    try {
      await deleteLesson(lesson._id);
      await refetch();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    }
  };

  const renderPreviewBlock = (block: LessonContentBlock, index: number) => {
    switch (block.type) {
      case "TEXT":
        return (
          <p
            key={index}
            className="whitespace-pre-wrap text-sm leading-7 text-text-secondary"
          >
            {block.content}
          </p>
        );
      case "HEADING":
        return block.level === 3 ? (
          <h4
            key={index}
            className="font-serif text-lg font-semibold text-text-primary"
          >
            {block.content}
          </h4>
        ) : (
          <h3
            key={index}
            className="font-serif text-xl font-semibold text-text-primary"
          >
            {block.content}
          </h3>
        );
      case "CODE":
        return (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-[#191816] text-[#F4F0E8]"
          >
            <div className="border-b border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#C7C1B8]">
              {block.language}
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-6">
              <code>{block.content}</code>
            </pre>
          </div>
        );
      
case 'CALLOUT': {
  const calloutStyles = {
    INFO: {
      container: 'border-border bg-surface-elevated',
      label: 'text-text-secondary',
      icon: 'text-text-secondary',
    },
    TIP: {
      container: 'border-sage/30 bg-sage-soft',
      label: 'text-sage',
      icon: 'text-sage',
    },
    WARNING: {
      container: 'border-error/30 bg-error-soft',
      label: 'text-error',
      icon: 'text-error',
    },
    IMPORTANT: {
      container: 'border-signal/30 bg-signal-soft',
      label: 'text-signal',
      icon: 'text-signal',
    },
  } satisfies Record<
    LessonCalloutVariant,
    { container: string; label: string; icon: string }
  >;

  const style = calloutStyles[block.variant];

  return (
    <aside
      key={index}
      className={`rounded-xl border p-4 ${style.container}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <Lightbulb
          className={`h-4 w-4 ${style.icon}`}
          aria-hidden="true"
        />
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${style.label}`}
        >
          {block.variant}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
        {block.content}
      </p>
    </aside>
  );
}

      case "LIST":
        return block.style === "NUMBERED" ? (
          <ol
            key={index}
            className="list-decimal space-y-1.5 pl-6 text-sm leading-relaxed text-text-secondary"
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ol>
        ) : (
          <ul
            key={index}
            className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-text-secondary"
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        );
      case "IMAGE":
        return (
          <figure
            key={index}
            className="rounded-xl border border-border bg-surface-elevated p-3"
          >
            <img
              src={block.url}
              alt={block.alt}
              className="mx-auto max-h-72 rounded-lg object-contain"
            />
            <figcaption className="mt-2 text-center text-xs text-text-secondary">
              {block.alt}
            </figcaption>
          </figure>
        );
      case "VIDEO":
        return (
          <a
            key={index}
            href={block.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-4 text-sm text-text-primary transition-colors hover:border-signal/40 hover:bg-signal-soft"
          >
            <BookOpen
              className="h-5 w-5 shrink-0 text-signal"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{block.title}</span>
            <span className="text-xs font-semibold text-signal">
              Open video ↗
            </span>
          </a>
        );
    }
  };

  const isReadOnly = !isEditable;

  return (
    <section className="space-y-4" aria-labelledby="lesson-management-heading">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sage/25 bg-sage-soft text-sage">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="lesson-management-heading"
              className="font-semibold text-text-primary"
            >
              Lessons
            </h3>
            <p className="mt-0.5 text-sm text-text-secondary">
              Create clear, focused learning steps for{" "}
              <span className="font-medium text-text-primary">
                {topicTitle}
              </span>
              .
            </p>
          </div>
        </div>
        {isEditable && !isFormOpen && (
          <Button size="sm" onClick={openCreateForm} className={interactive}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Lesson
          </Button>
        )}
      </div>

      {isReadOnly && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
            aria-hidden="true"
          />
          <p>
            {courseStatus === "PUBLISHED"
              ? "This course is published. Lessons are shown in read-only mode."
              : "This course is archived. Its lessons are read-only."}
          </p>
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{actionError}</p>
        </div>
      )}

      {isFormOpen && isEditable && (
        <form
          ref={formRef}
          onSubmit={handleSave}
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-signal/30 bg-surface shadow-sm"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border-muted bg-surface-elevated p-4 sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">
                {editingLessonId ? "Edit lesson" : "New lesson"}
              </p>
              <h4 className="mt-1 font-serif text-xl font-semibold text-text-primary">
                {editingLessonId
                  ? "Refine this learning step"
                  : "Create a lesson learners can follow"}
              </h4>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
                Write naturally or paste your existing notes. Use the toolbar to
                turn headings, lists, code, and callouts into structured lesson
                content.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              aria-label="Close lesson editor"
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="space-y-1.5">
              <label
                htmlFor="lesson-title"
                className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Lesson title <span className="text-error">*</span>
              </label>
              <input
                id="lesson-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                minLength={4}
                maxLength={150}
                required
                placeholder="e.g. How a Perceptron Makes a Prediction"
                className={fieldClass}
              />
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>4–150 characters</span>
                <span>{form.title.length}/150</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="lesson-description"
                className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Short description{" "}
                <span className="font-normal normal-case tracking-normal">
                  (optional)
                </span>
              </label>
              <textarea
                id="lesson-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                maxLength={500}
                rows={2}
                placeholder="What will learners understand after this lesson?"
                className={`${fieldClass} resize-y`}
              />
              <p className="text-right text-xs text-text-tertiary">
                {form.description.length}/500
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label
                    htmlFor="lesson-markdown"
                    className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Lesson content <span className="text-error">*</span>
                  </label>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Paste notes or write directly. Structure is converted to the
                    lesson blocks supported by the backend.
                  </p>
                </div>
                <span className="text-xs text-text-tertiary">
                  {parsedBlocks.length}/100 blocks
                </span>
              </div>
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-t-xl border border-border bg-surface-elevated p-2"
                aria-label="Lesson formatting toolbar"
              >
                <button
                  type="button"
                  onClick={() => insertSnippet("## Section heading")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary ${interactive}`}
                >
                  <Heading2 className="h-4 w-4" aria-hidden="true" />
                  Heading
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet("- First point\n- Second point")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary ${interactive}`}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                  Bullets
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet("1. First step\n2. Second step")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary ${interactive}`}
                >
                  <ListOrdered className="h-4 w-4" aria-hidden="true" />
                  Numbered
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      "```javascript\n// Add your example here\n```",
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary ${interactive}`}
                >
                  <Code2 className="h-4 w-4" aria-hidden="true" />
                  Code
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet("> [!TIP]\n> Add a useful tip here.")
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary ${interactive}`}
                >
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  Tip callout
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      "@[video: Video title](https://example.com/video)",
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary ${interactive}`}
                >
                  <Video className="h-4 w-4" aria-hidden="true" />
                  Video link
                </button>
                <span className="ml-auto inline-flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  <Type className="h-3.5 w-3.5" aria-hidden="true" />
                  Write
                </span>
              </div>
              <textarea
                ref={markdownRef}
                id="lesson-markdown"
                value={form.markdown}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    markdown: event.target.value,
                  }));
                  setShowPreview(false);
                }}
                rows={14}
                spellCheck
                placeholder={
                  "Start with a clear explanation…\n\n## How it works\nExplain the idea in your own words.\n\n- First key point\n- Second key point\n\n```javascript\n// Optional code example\n```"
                }
                className="block w-full resize-y rounded-b-xl border-x border-b border-border bg-surface px-4 py-4 font-mono text-sm leading-7 text-text-primary outline-none placeholder:font-sans placeholder:text-text-tertiary focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-text-tertiary">
                  Supports headings, paragraphs, lists, fenced code, callouts,
                  and video links using the toolbar.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPreview((current) => !current)}
                  className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:border-signal/35 hover:bg-signal-soft hover:text-signal sm:self-auto ${interactive}`}
                >
                  {showPreview ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                  {showPreview ? "Hide preview" : "Preview lesson"}
                </button>
              </div>
              {Object.keys(preservedMedia).length > 0 && (
                <div className="rounded-xl border border-border bg-surface-elevated p-3 text-xs leading-relaxed text-text-secondary">
                  <p className="font-semibold text-text-primary">
                    Existing media is protected
                  </p>
                  <p className="mt-1">
                    Markers such as{" "}
                    <code className="rounded bg-surface-disabled px-1.5 py-0.5">
                      [[Existing image #1]]
                    </code>{" "}
                    keep existing media attached without showing its URL. Keep
                    each marker to preserve that media; removing a marker
                    removes it from the lesson.
                  </p>
                </div>
              )}
              {showPreview && (
                <div className="space-y-4 rounded-2xl border border-signal/20 bg-surface-elevated p-4 sm:p-6">
                  <div className="flex items-center gap-2 border-b border-border-muted pb-3">
                    <Eye className="h-4 w-4 text-signal" aria-hidden="true" />
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">
                      Learner preview
                    </p>
                  </div>
                  <div className="space-y-4">
                    {parsedBlocks.length ? (
                      parsedBlocks.map((block, index) =>
                        renderPreviewBlock(block, index),
                      )
                    ) : (
                      <p className="text-sm italic text-text-tertiary">
                        Your formatted lesson preview will appear here.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-soft p-3 text-sm text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <p>{formError}</p>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-border-muted pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-text-tertiary">
                Your lesson is saved to this topic when you submit.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeForm}
                  disabled={isSaving}
                  className={interactive}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSaving}
                  className={interactive}
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {editingLessonId ? "Save Changes" : "Create Lesson"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <div
          className="space-y-3"
          aria-label="Loading lessons"
          aria-busy="true"
        >
          {[0, 1].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-border bg-surface p-5"
            >
              <div className="mb-3 h-3 w-20 rounded bg-surface-disabled" />
              <div className="mb-2 h-5 w-2/3 rounded bg-surface-disabled" />
              <div className="h-3 w-full max-w-lg rounded bg-surface-disabled" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-error/20 bg-error-soft p-5">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-error"
              aria-hidden="true"
            />
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-text-primary">
                Unable to load lessons
              </h4>
              <p className="text-sm text-text-secondary">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refetch()}
                className={`mt-2 ${interactive}`}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : lessons.length === 0 && !isFormOpen ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center sm:py-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-signal">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
            A fresh start
          </p>
          <h4 className="mt-2 font-serif text-xl font-semibold text-text-primary">
            No lessons in this topic yet
          </h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Start with a short explanation, paste your notes, then add headings,
            examples, and lists as needed.
          </p>
          {isEditable && (
            <Button onClick={openCreateForm} className={`mt-5 ${interactive}`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create First Lesson
            </Button>
          )}
        </div>
      ) : lessons.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1 text-xs text-text-tertiary">
            <span>
              {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
            </span>
            {isEditable && lessons.length > 1 && (
              <span>Use arrows to change the learning order.</span>
            )}
          </div>
          {lessons.map((lesson, index) => (
            <article
              key={lesson._id}
              className="rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:border-text-tertiary/50 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sage/25 bg-sage-soft text-sm font-bold text-sage">
                  {String(lesson.order).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="break-words font-semibold text-text-primary">
                        {lesson.title}
                      </h4>
                      {lesson.description && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
                          {lesson.description}
                        </p>
                      )}
                    </div>
                    {isEditable && (
                      <div className="flex shrink-0 items-center gap-1 self-start">
                        <button
                          type="button"
                          onClick={() => void moveLesson(index, -1)}
                          disabled={
                            index === 0 ||
                            reorderingLessonId !== null ||
                            isFormOpen ||
                            isSaving
                          }
                          aria-label={`Move ${lesson.title} up`}
                          title="Move lesson up"
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveLesson(index, 1)}
                          disabled={
                            index === lessons.length - 1 ||
                            reorderingLessonId !== null ||
                            isFormOpen ||
                            isSaving
                          }
                          aria-label={`Move ${lesson.title} down`}
                          title="Move lesson down"
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(lesson)}
                          disabled={
                            reorderingLessonId !== null ||
                            isSaving ||
                            isFormOpen
                          }
                          aria-label={`Edit ${lesson.title}`}
                          title="Edit lesson"
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-signal/40 hover:bg-signal-soft hover:text-signal ${interactive}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(lesson)}
                          disabled={
                            reorderingLessonId !== null ||
                            isSaving ||
                            isFormOpen
                          }
                          aria-label={`Delete ${lesson.title}`}
                          title="Delete lesson"
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-error/40 hover:bg-error-soft hover:text-error ${interactive}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
              {reorderingLessonId === lesson._id && (
                <p className="mt-3 text-xs text-text-secondary" role="status">
                  Saving lesson order…
                </p>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default LessonManagement;
