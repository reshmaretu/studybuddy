import fs from 'fs';

const path = "c:\\Users\\mark\\Downloads\\app project\\studybuddy-repository\\apps\\web\\src\\components\\LanternNetwork.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldTitleStr = `<h3 className="font-black text-sm">{user.name}</h3>`;
const newTitleStr = `<h3 className="font-black text-sm">{user.name}</h3>
                                        <p className="text-[9px] font-bold text-[var(--accent-teal)] italic">
                                            {user.hours > 10 ? "The Void Walker" : user.hours > 5 ? "The Deep Thinker" : "The Novice Scholar"}
                                        </p>`;

if (!content.includes('"The Void Walker"')) {
    content = content.replace(oldTitleStr, newTitleStr);
    fs.writeFileSync(path, content, "utf-8");
    console.log("Titles added");
}
