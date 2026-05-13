import fs from 'fs';

const path = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\ChumWidget.tsx";
let content = fs.readFileSync(path, "utf-8");

// State injection
const old_state_sig = "const [isScheduled, setIsScheduled] = useState(false);";
const new_state_sig = `const [isScheduled, setIsScheduled] = useState(false);

    // Chum Petting State
    const [petHearts, setPetHearts] = useState<{ id: number, x: number }[]>([]);
    const petCounter = useRef(0);
    const [chumScale, setChumScale] = useState(1);
    
    const handlePetChum = (e: React.MouseEvent) => {
        e.stopPropagation();
        petCounter.current += 1;
        setPetHearts(prev => [...prev, { id: petCounter.current, x: (Math.random() - 0.5) * 40 }]);
        
        // Physical Squish/Jump
        setChumScale(0.8);
        setTimeout(() => setChumScale(1.15), 100);
        setTimeout(() => setChumScale(1.0), 300);

        setTimeout(() => {
            setPetHearts(prev => prev.filter(p => p.id !== petCounter.current));
        }, 800);
    };`;

content = content.replace(old_state_sig, new_state_sig);

// Button injection
const old_button = `<motion.button onClick={() => setIsOpen(!isOpen)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-16 h-16 rounded-full bg-(--bg-card) border-2 border-(--border-color) shadow-xl flex items-center justify-center relative hover:border-(--accent-teal) transition-colors overflow-hidden">
                    <div className="absolute inset-0 rounded-full blur-md -z-10" style={{ backgroundColor: \`color-mix(in srgb, \${themeColor} 15%, transparent)\` }}></div>
                    {isTutorModeActive ? <BrainCircuit size={28} color={themeColor} /> : <ChumRenderer size="w-14 h-14 scale-125 translate-y-1" />}
                </motion.button>`;

const new_button = `<motion.button 
                    onClick={(e) => {
                        handlePetChum(e);
                        // Open slightly delayed so they enjoy the pet!
                        setTimeout(() => setIsOpen(!isOpen), 150);
                    }} 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }} 
                    animate={{ scale: chumScale }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="w-16 h-16 rounded-full bg-(--bg-card) border-2 border-(--border-color) shadow-xl flex items-center justify-center relative hover:border-(--accent-teal) transition-colors overflow-visible"
                >
                    <div className="absolute inset-0 rounded-full blur-md -z-10" style={{ backgroundColor: \`color-mix(in srgb, \${themeColor} 15%, transparent)\` }}></div>
                    {isTutorModeActive ? <BrainCircuit size={28} color={themeColor} /> : <ChumRenderer size="w-14 h-14 scale-125 translate-y-1" />}
                    
                    <AnimatePresence>
                        {petHearts.map(heart => (
                            <motion.div
                                key={heart.id}
                                initial={{ opacity: 1, y: -20, x: heart.x, scale: 0 }}
                                animate={{ opacity: 0, y: -80, x: heart.x + (Math.random() - 0.5) * 20, scale: 1.5 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute text-red-500 pointer-events-none z-[1000] text-xl drop-shadow-md"
                            >
                                ❤️
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.button>`;

if (content.indexOf(old_button) === -1) {
    console.error("COULD NOT FIND BUTTON TO REPLACE");
} else {
    content = content.replace(old_button, new_button);
    fs.writeFileSync(path, content, "utf-8");
    console.log("done");
}
