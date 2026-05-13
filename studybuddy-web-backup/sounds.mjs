import fs from 'fs';

const sidebarPath = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\Sidebar.tsx";
let sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

if (!sidebarContent.includes("import { playTick }")) {
    sidebarContent = sidebarContent.replace('import { usePathname } from "next/navigation";', 'import { usePathname } from "next/navigation";\nimport { playTick } from "@/lib/sound";');
    sidebarContent = sidebarContent.replaceAll('<Link href={item.path}', '<Link href={item.path} onClick={playTick}');
    fs.writeFileSync(sidebarPath, sidebarContent, "utf-8");
    console.log("Sidebar ticks added");
}

const wardrobePath = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\app\\wardrobe\\page.tsx";
let wardrobeContent = fs.readFileSync(wardrobePath, "utf-8");

if (!wardrobeContent.includes("import { playTick }")) {
    wardrobeContent = wardrobeContent.replace('import { useStudyStore, DEFAULT_CHUM_COLORS } from "@studybuddy/api";', 'import { useStudyStore, DEFAULT_CHUM_COLORS } from "@studybuddy/api";\nimport { playTick } from "@/lib/sound";');
    // Replace onClick on buttons to also play tick
    wardrobeContent = wardrobeContent.replace(
        'onClick={() => setActiveTab(tab.id as any)}',
        'onClick={() => { playTick(); setActiveTab(tab.id as any); }}'
    );
    wardrobeContent = wardrobeContent.replace(
        'onClick={() => setUseChumAvatar(true)}',
        'onClick={() => { playTick(); setUseChumAvatar(true); }}'
    );
    wardrobeContent = wardrobeContent.replace(
        'onClick={() => setUseChumAvatar(false)}',
        'onClick={() => { playTick(); setUseChumAvatar(false); }}'
    );
    fs.writeFileSync(wardrobePath, wardrobeContent, "utf-8");
    console.log("Wardrobe ticks added");
}

const taskCardPath = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\TaskCard.tsx";
if (fs.existsSync(taskCardPath)) {
    let taskCardContent = fs.readFileSync(taskCardPath, "utf-8");

    if (!taskCardContent.includes("import { playChime }")) {
        taskCardContent = taskCardContent.replace('import { useStudyStore } from "@studybuddy/api";', 'import { useStudyStore } from "@studybuddy/api";\nimport { playChime } from "@/lib/sound";');
        
        // Find the completeTask or similar logic
        const target = 'toggleTaskStatus(task.id, newStatus);';
        const replacement = `toggleTaskStatus(task.id, newStatus);
        if (newStatus === "DONE" && task.status !== "DONE") {
            playChime();
        }`;
        
        taskCardContent = taskCardContent.replace(target, replacement);
        fs.writeFileSync(taskCardPath, taskCardContent, "utf-8");
        console.log("TaskCard chime added");
    }
} else {
    console.log("TaskCard.tsx not found, maybe it is named differently");
}
