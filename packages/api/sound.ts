let audioCtx: AudioContext | null = null;

export const getCtx = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(console.error);
    }
    return audioCtx;
};

export const unlockAudio = async () => {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
    }
};

// Global config - will be synced with store
export let soundConfig = {
    tickEnabled: true,
    chimeEnabled: true
};

export const setSoundConfig = (config: Partial<typeof soundConfig>) => {
    soundConfig = { ...soundConfig, ...config };
};

// Soft lo-fi tick/pop for UI elements
export const playTick = () => {
    if (!soundConfig.tickEnabled) return;
    try {
        const ctx = getCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // High frequency dropping very fast makes a 'click' or 'tick' sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

export const playPop = () => {
    try {
        const ctx = getCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // More resonant "pop"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

export const playChime = () => {
    if (!soundConfig.chimeEnabled) return;
    try {
        const ctx = getCtx();
        if (!ctx) return;

        const playTone = (freq: number, startTime: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 2.0);
        };

        const now = ctx.currentTime;
        // Ascending major chord (C5, E5, G5)
        playTone(523.25, now);       // C5
        playTone(659.25, now + 0.1); // E5
        playTone(783.99, now + 0.2); // G5
        playTone(1046.50, now + 0.3); // C6
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};
// ─── Procedural Noise Engine (Offline-First) ────────────────────────────────
let noiseSource: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;

const createNoiseBuffer = (ctx: AudioContext, type: 'white' | 'pink' | 'brown') => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') {
            output[i] = white;
        } else if (type === 'pink') {
            // Simple pink noise approximation
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // compensation
        } else if (type === 'brown') {
            // Brown noise (leaky integrator)
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }
    }
    return buffer;
};

export const startNoise = (type: 'white' | 'pink' | 'brown' = 'white', volume = 0.05) => {
    try {
        const ctx = getCtx();
        if (!ctx) return;

        if (noiseSource) stopNoise();

        noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer(ctx, type);
        noiseSource.loop = true;

        noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1); // Fade in

        // If it's brown noise, let's add a low-pass filter to make it "Rainy"
        if (type === 'brown') {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            noiseSource.connect(filter);
            filter.connect(noiseGain);
        } else {
            noiseSource.connect(noiseGain);
        }

        noiseGain.connect(ctx.destination);
        noiseSource.start();
    } catch (e) {
        console.error("Noise generation failed", e);
    }
};

export const stopNoise = () => {
    if (noiseGain && getCtx()) {
        const ctx = getCtx()!;
        noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => {
            if (noiseSource) {
                noiseSource.stop();
                noiseSource.disconnect();
                noiseSource = null;
            }
            if (noiseGain) {
                noiseGain.disconnect();
                noiseGain = null;
            }
        }, 500);
    }
};
