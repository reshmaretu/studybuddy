import fs from 'fs';

const path = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\packages\\ui\\SyntheticFeed.tsx";
let content = fs.readFileSync(path, "utf-8");

// Add confetti import
if (!content.includes('import confetti')) {
    content = content.replace("import * as THREE from 'three';", "import * as THREE from 'three';\nimport confetti from 'canvas-confetti';");
}

// Replace handleSpark
const oldHandleSpark = `const handleSpark = (name: string, id: string) => {
    const now = Date.now();
    if (now < cooldownUntil) return;
    if (sparkedIds.has(id)) return;
    setSparkedIds((prev) => new Set(prev).add(id));
    setCooldownUntil(now + 2000);
    setSparkBurst({ id, name });
    const safeName = name?.trim() || 'that user';
    triggerChumToast?.(\`You sparked \${safeName}'s feed\`, 'success');
  };`;

const newHandleSpark = `const handleSpark = (name: string, id: string, event: React.MouseEvent) => {
    const now = Date.now();
    if (now < cooldownUntil) return;
    if (sparkedIds.has(id)) return;
    setSparkedIds((prev) => new Set(prev).add(id));
    setCooldownUntil(now + 2000);
    setSparkBurst({ id, name });
    const safeName = name?.trim() || 'that user';
    triggerChumToast?.(\`You sparked \${safeName}'s feed\`, 'success');

    // Confetti explosion from the button
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { x, y },
      colors: ['#2dd4bf', '#facc15', '#ff007f'],
      zIndex: 100000,
      disableForReducedMotion: true
    });
  };`;

content = content.replace(oldHandleSpark, newHandleSpark);

// Replace the click handler call
content = content.replace(
    `onClick={() => handleSpark(displayName, broadcast.id)}`,
    `onClick={(e) => handleSpark(displayName, broadcast.id, e)}`
);

// Optional: we keep the WebGL effect but it will be overlayed with confetti! Wait, the webgl effect blocks clicks because of the full screen canvas.
// Ah! "pointer-events-none" is on the div, but maybe the 3D effect had bugs? The user said "fix/update". Combining them is good.
// The WebGL spark effect is already `pointer-events-none`.

fs.writeFileSync(path, content, "utf-8");
console.log("Feed fixed");
