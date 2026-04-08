import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { IntegrationView } from "@/lib/integration-api";

interface RenameViewDialogProps {
	view: IntegrationView | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (viewId: string, name: string) => Promise<unknown>;
	isPending?: boolean;
}

export function RenameViewDialog({
	view,
	open,
	onOpenChange,
	onSubmit,
	isPending,
}: RenameViewDialogProps) {
	const [name, setName] = useState(view?.name ?? "");

	useEffect(() => {
		if (view) setName(view.name);
	}, [view]);

	const submit = async () => {
		if (!view || !name.trim()) return;
		await onSubmit(view.id, name.trim());
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xs">
				<DialogHeader>
					<DialogTitle>Rename view</DialogTitle>
				</DialogHeader>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
				/>
				<DialogFooter>
					<DialogClose render={<Button variant="outline" size="sm" />}>
						Cancel
					</DialogClose>
					<Button
						size="sm"
						disabled={!name.trim() || isPending}
						onClick={submit}
					>
						{isPending ? "Renaming…" : "Rename"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
