import fs from 'fs';

const path = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\LanternNetwork.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldAngle = `        const getAngle = (seed: string) => {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
            }
            return (Math.abs(hash) % 360) * (Math.PI / 180);
        };`;

const newAngle = `        const getAngle = (seed: string) => {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
            }
            return (Math.abs(hash) % 360) * (Math.PI / 180);
        };

        const getPactColor = (seed: string) => {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
            }
            return \`hsl(\${Math.abs(hash) % 360}, 80%, 65%)\`;
        };`;

content = content.replace(oldAngle, newAngle);

const oldColorStr = `color: pact.constellation_color || '#2dd4bf'`;
const newColorStr = `color: pact.constellation_color || getPactColor(pact.id || 'default')`;

// Replace all instances
content = content.replaceAll(oldColorStr, newColorStr);

fs.writeFileSync(path, content, "utf-8");
console.log("Pact colors fixed");
