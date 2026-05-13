import fs from 'fs';

const path = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\LanternNetwork.tsx";
let content = fs.readFileSync(path, "utf-8");

// Add ShootingStars Component
const starsComponent = `
function ShootingStars() {
    const lines = useRef<THREE.Line[]>([]);
    const scene = useThree((state) => state.scene);

    useEffect(() => {
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -20)]);
            const line = new THREE.Line(geometry, material);
            // Start way outside
            line.position.set((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400, -200 - Math.random() * 200);
            
            // Random direction
            const angleX = (Math.random() - 0.5) * Math.PI;
            const angleY = (Math.random() - 0.5) * Math.PI;
            line.rotation.set(angleX, angleY, 0);

            // Store custom speed in userData
            line.userData = { speed: 80 + Math.random() * 100, active: Math.random() > 0.5, delay: Math.random() * 5 };
            
            scene.add(line);
            lines.current.push(line);
        }

        return () => {
            lines.current.forEach(line => {
                scene.remove(line);
                line.geometry.dispose();
            });
            material.dispose();
        };
    }, [scene]);

    useFrame((state, delta) => {
        lines.current.forEach((line) => {
            if (!line.userData.active) {
                line.userData.delay -= delta;
                if (line.userData.delay <= 0) {
                    line.userData.active = true;
                    // Reset position
                    line.position.set((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400, -200 - Math.random() * 200);
                    const angleX = (Math.random() - 0.5) * Math.PI;
                    const angleY = (Math.random() - 0.5) * Math.PI;
                    line.rotation.set(angleX, angleY, 0);
                    line.userData.speed = 150 + Math.random() * 200;
                }
            } else {
                line.translateZ(-line.userData.speed * delta);
                // If it goes too far, reset
                if (Math.abs(line.position.x) > 400 || Math.abs(line.position.y) > 400 || line.position.z > 200) {
                    line.userData.active = false;
                    line.userData.delay = 1 + Math.random() * 4;
                }
            }
        });
    });

    return null;
}
`;

if (!content.includes('function ShootingStars')) {
    content = content.replace("export default ThreeLanternNet;", starsComponent + "\nexport default ThreeLanternNet;");
}

const addShootingStars = `<GlobalPulse key={users.length} />\n                {is3D && <ShootingStars />}`;
if (!content.includes('<ShootingStars />')) {
    content = content.replace("<GlobalPulse key={users.length} />", addShootingStars);
}

fs.writeFileSync(path, content, "utf-8");
console.log("Shooting stars added");
