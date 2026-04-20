import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCallback, useEffect, useRef } from "react";

import { useThemeMode } from "@/hooks/use-theme-mode";
import { getDocFileDownloadURL, uploadDocFile } from "@/lib/doc-api";

/** Custom URI scheme used to store doc file references in the block content. */
const DOC_FILE_SCHEME = "docfile://";

interface DocEditorProps {
	/** BlockNote block array loaded from the server. */
	content?: unknown[] | null;
	/** Whether the editor is interactive. */
	editable?: boolean;
	/** Called when the user stops editing (blur or Ctrl+S). Receives the new block array (null = empty). */
	onSave?: (blocks: unknown[] | null) => void;
	/** Project ID — required for file uploads. */
	projectId?: string;
	/** Document ID — required for file uploads. */
	docId?: string;
}

export function DocEditor({
	content,
	editable = true,
	onSave,
	projectId,
	docId,
}: DocEditorProps) {
	const { resolvedMode } = useThemeMode();

	const lastSavedRef = useRef<string | null>(null);
	const initializedRef = useRef(false);
	const pendingRef = useRef(false);

	// Keep projectId / docId in refs so stable editor callbacks always
	// reference the latest prop values without recreating the editor.
	const projectIdRef = useRef(projectId);
	const docIdRef = useRef(docId);
	useEffect(() => {
		projectIdRef.current = projectId;
	}, [projectId]);
	useEffect(() => {
		docIdRef.current = docId;
	}, [docId]);

	const editor = useCreateBlockNote({
		uploadFile: async (file: File) => {
			const pId = projectIdRef.current;
			const dId = docIdRef.current;
			if (!pId || !dId) throw new Error("No project/doc context for upload");
			const uploaded = await uploadDocFile(pId, dId, file);
			// Store as a stable custom URI; presigned URL is fetched on-demand.
			return `${DOC_FILE_SCHEME}${pId}/${dId}/${uploaded.id}`;
		},
		resolveFileUrl: async (url: string) => {
			if (!url.startsWith(DOC_FILE_SCHEME)) return url;
			// URI format: docfile://{projectId}/{docId}/{fileId}
			const path = url.slice(DOC_FILE_SCHEME.length);
			const [pId, dId, fileId] = path.split("/");
			if (!pId || !dId || !fileId) return url;
			return getDocFileDownloadURL(pId, dId, fileId);
		},
	});

	// Populate / re-populate editor from server content
	useEffect(() => {
		const normalized = content ?? null;
		const normalizedStr = normalized ? JSON.stringify(normalized) : null;
		if (initializedRef.current && normalizedStr === lastSavedRef.current)
			return;
		initializedRef.current = true;
		lastSavedRef.current = normalizedStr;

		let blocks: Parameters<typeof editor.replaceBlocks>[1] | undefined;
		if (normalized && Array.isArray(normalized) && normalized.length > 0) {
			blocks = normalized as Parameters<typeof editor.replaceBlocks>[1];
		}
		editor.replaceBlocks(editor.document, blocks ?? []);
	}, [content, editor]);

	const save = useCallback(() => {
		if (!editable || !pendingRef.current) return;
		pendingRef.current = false;
		const blocks = editor.document;
		const isEmpty =
			blocks.length === 1 &&
			blocks[0].type === "paragraph" &&
			Array.isArray(blocks[0].content) &&
			blocks[0].content.length === 0;

		const value: unknown[] | null = isEmpty ? null : (blocks as unknown[]);
		const valueStr = value ? JSON.stringify(value) : null;
		if (valueStr !== lastSavedRef.current) {
			lastSavedRef.current = valueStr;
			onSave?.(value);
		}
	}, [editable, editor, onSave]);

	const handleChange = useCallback(() => {
		if (!editable) return;
		pendingRef.current = true;
	}, [editable]);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLDivElement>) => {
			if (e.currentTarget.contains(e.relatedTarget as Node)) return;
			save();
		},
		[save],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				save();
			}
		},
		[save],
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: wrapper captures blur/keydown from BlockNote rich-text editor
		<div
			data-testid="blocknote-editor"
			className="rounded-xl border border-border/25 bg-card/50 hover:border-border/50 transition-all duration-200 overflow-hidden [&_.bn-editor]:min-h-80 [&_.bn-editor]:py-4 [&_.bn-editor]:px-6 [&_.bn-editor]:text-[14px] [&_.bn-editor]:leading-relaxed"
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
		>
			<BlockNoteView
				editor={editor}
				editable={editable}
				theme={resolvedMode}
				onChange={handleChange}
			/>
		</div>
	);
}
