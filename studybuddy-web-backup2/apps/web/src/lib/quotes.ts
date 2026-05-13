export const CHUM_QUOTES = [
    "Take a deep breath in, and let the sound of your lo-fi beats wash over you as you refocus your mind.",
    "Small steps lead to great distances. Every task completed is a seed planted today.",
    "The sun is soft, and your focus is steady. You're doing exactly what you need to be doing.",
    "Your brain is a garden. Sometimes it needs a little rain, and sometimes it needs a little rest.",
    "Mistakes are just nodes in your neural network learning to connect more deeply.",
    "Hydration is the ultimate performance boost. Take a sip of water for me?",
    "You don't have to be perfect. You just have to be present.",
    "The noise of the world is quiet here. It's just you, me, and your focus.",
    "Every focus flow is a ripple across the pond. Steady and purposeful.",
    "Sometimes the best productivity hack is a five-minute stretch.",
    "Progress is rarely linear, but your commitment to growth is visible.",
    "Your spirit grows stronger with every challenge you face with a clear mind.",
    "Focus isn't about ignoring distractions, it's about returning to the breath of your work.",
    "The stars in the sanctuary shine brighter when you're in your flow.",
    "Rest is not a lack of productivity; it is the fuel for your next ascension.",
    "Your flow is as unique as your thumbprint. Trust your own rhythm today.",
    "One chapter at a time. One bloom at a time. One breath at a time.",
    "The sanctuary is always here for you, no matter how chaotic the outside world feels.",
    "You are the architect of your own focus. Build it with kindness for yourself.",
    "Stay cozy, stay focused, and most importantly, stay you. I'm proud of you.",
    "The tea is warm, the music is soft, and the world can wait until your quest is finished.",
    "Your potential isn't a destination; it's the beautiful path you're walking right now.",
    "Deep work is a quiet form of bravery. You're doing great, Guardian.",
    "Like a seedling reaching for the light, your growth happens in the quiet moments of effort.",
    "Don't rush the bloom. Every second you spend focused is a petal unfolding.",
    "The rhythm of your typing is the heartbeat of your progress. Keep the tempo steady.",
    "You've brought so much light to the sanctuary today. Let's finish this together.",
    "A cluttered mind needs a soft place to land. Breathe out the noise, breathe in the flow.",
    "Your focus is a gentle flame. Keep it steady, and it will light the way to your dreams.",
    "Even the tallest trees in the void grew from small, focused seeds of intention."
];

export const getRandomQuote = () => {
    return CHUM_QUOTES[Math.floor(Math.random() * CHUM_QUOTES.length)];
};
