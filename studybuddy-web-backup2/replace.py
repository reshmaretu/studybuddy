import os
import re

path = r"c:\Users\mark\Downloads\app project\studybuddy-repository\apps\web\src\components\LanternNetwork.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# ConstellationLink
old_sig = "function ConstellationLink({ start, end, color, is3D }: { start: [number, number, number]; end: [number, number, number]; color: string; is3D: boolean }) {"
end_sig = "function AnimatedSanctuaryLink("

idx1 = content.find(old_sig)
idx2 = content.find(end_sig, idx1)

if idx1 != -1 and idx2 != -1:
    old_block = content[idx1:idx2]
    new_block = """function ConstellationLink({ start, end, color, is3D }: { start: [number, number, number]; end: [number, number, number]; color: string; is3D: boolean }) {
    const lineRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (lineRef.current?.material) {
            lineRef.current.material.dashOffset -= delta * 1.5;
        }
    });

    return (
        <Line 
            ref={lineRef}
            points={[start, end]} 
            color={color} 
            transparent 
            opacity={is3D ? 0.8 : 0.6} 
            lineWidth={is3D ? 2.5 : 1.5}
            dashed={true}
            dashSize={0.4}
            gapSize={0.4} 
        />
    );
}

"""
    content = content[:idx1] + new_block + content[idx2:]


# AnimatedSanctuaryLink
old_sig_2 = "function AnimatedSanctuaryLink({ start, end, is3D, isSelf, isHosting }: {"
end_sig_2 = "function SingleLantern("

idx3 = content.find(old_sig_2)
idx4 = content.find(end_sig_2, idx3)

if idx3 != -1 and idx4 != -1:
    new_block_2 = """function AnimatedSanctuaryLink({ start, end, is3D, isSelf, isHosting }: {
    start: [number, number, number],
    end: [number, number, number],
    is3D: boolean,
    isSelf: boolean,
    isHosting: boolean
}) {
    const lineRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (!lineRef.current) return;
        const mat = lineRef.current.material as any;
        
        // Let the energy dots flow to the hosted room!
        mat.dashOffset -= delta * (isHosting ? 3.0 : 1.5); 

        if (isHosting) {
            const t = state.clock.elapsedTime * 5;
            mat.lineWidth = 2.5 + Math.sin(t) * 1;
            mat.opacity = 0.7 + Math.sin(t) * 0.2;
        } else {
            mat.lineWidth = 1.5;
            mat.opacity = 0.4;
        }
    });

    if (is3D) {
        return (
            <Line 
                ref={lineRef}
                points={[start, end]} 
                color={isSelf ? "#ff007f" : "#2dd4bf"} 
                transparent 
                opacity={0.4} 
                lineWidth={1}
                dashed={true}
                dashSize={0.8}
                gapSize={0.4}
            />
        );
    }

    return (
        <QuadraticBezierLine
            ref={lineRef}
            start={start}
            end={end}
            mid={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 6, 0] as [number, number, number]}
            color={isSelf ? "#ff007f" : "#2dd4bf"}
            transparent
            opacity={0.4}
            lineWidth={1}
            dashed={true}
            dashSize={0.8}
            gapSize={0.4}
        />
    );
}

"""
    content = content[:idx3] + new_block_2 + content[idx4:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
