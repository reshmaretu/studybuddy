import fs from 'fs';

const path = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\LanternNetwork.tsx";
let content = fs.readFileSync(path, "utf-8");

// ConstellationLink
const old_sig = "function ConstellationLink({ start, end, color, is3D }: { start: [number, number, number]; end: [number, number, number]; color: string; is3D: boolean }) {";
const end_sig = "function AnimatedSanctuaryLink(";

const idx1 = content.indexOf(old_sig);
const idx2 = content.indexOf(end_sig, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    const new_block = `function ConstellationLink({ start, end, color, is3D }: { start: [number, number, number]; end: [number, number, number]; color: string; is3D: boolean }) {
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

`;
    content = content.slice(0, idx1) + new_block + content.slice(idx2);
}

// AnimatedSanctuaryLink
const old_sig_2 = "function AnimatedSanctuaryLink({ start, end, is3D, isSelf, isHosting }: {";
const end_sig_2 = "function SingleLantern(";

const idx3 = content.indexOf(old_sig_2);
const idx4 = content.indexOf(end_sig_2, idx3);

if (idx3 !== -1 && idx4 !== -1) {
    const new_block_2 = `function AnimatedSanctuaryLink({ start, end, is3D, isSelf, isHosting }: {
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

`;
    content = content.slice(0, idx3) + new_block_2 + content.slice(idx4);
}

fs.writeFileSync(path, content, "utf-8");
console.log("done");
