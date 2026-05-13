// Inside TldrawSafe.tsx
import { Tldraw, Editor } from "tldraw";

interface TldrawSafeProps {
    id: string;
    onMount: (editor: Editor) => void;
    showMenu?: boolean; // 👈 Add this line!
}

export default function TldrawSafe({ id, onMount, showMenu }: TldrawSafeProps) {
    return (
        <Tldraw
            persistenceKey={id}
            onMount={onMount}
            hideUi={!showMenu} // Often in tldraw, you use hideUi or specialized props
        />
    );
}