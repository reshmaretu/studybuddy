"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, Variants, AnimatePresence } from "framer-motion";
import { Sparkles, BrainCircuit, Network, Cpu, Coffee, Shield, CheckCircle2, Leaf, LayoutList, Grid2X2, ListOrdered, ListChecks, ArrowUp, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import GeodeScene from "@/components/GeodeScene";
import { useTerms } from "@/hooks/useTerms";

// --- DUMMY DATA FOR THE INTERACTIVE SHOWCASE ---
const SHOWCASE_TASKS = [
  { id: 1, text: "Finish final pitch deck", type: "urgent-important", size: "1", color: "border-red-400/50 text-red-400" },
  { id: 2, text: "Read Chapter 4 Notes", type: "not-urgent-important", size: "3", color: "border-[#789B8C]/50 text-[#789B8C]" },
  { id: 3, text: "Reply to group chat", type: "urgent-not-important", size: "3", color: "border-[#CD9A5B]/50 text-[#CD9A5B]" },
  { id: 4, text: "Organize digital folders", type: "not-urgent-not-important", size: "5", color: "border-[#A89F9A]/50 text-[#A89F9A]" },
  { id: 5, text: "Review flashcards", type: "not-urgent-important", size: "3", color: "border-[#789B8C]/50 text-[#789B8C]" },
  { id: 6, text: "Water desk plants", type: "not-urgent-not-important", size: "5", color: "border-[#A89F9A]/50 text-[#A89F9A]" },
];

export default function LandingPage() {
  const router = useRouter();
  const { isGamified } = useTerms();
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // State for the interactive framework morpher
  const [activeFramework, setActiveFramework] = useState<'standard' | 'eisenhower' | '135' | 'ivylee'>('standard');

  const [showScrollTop, setShowScrollTop] = useState(false);

  const springTransition = { type: "spring" as const, stiffness: 100, damping: 20 };
  const expoEase = [0.16, 1, 0.3, 1] as const;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: expoEase } }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, .interactive-card')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  // ⬆️ SCROLL TO TOP LOGIC
  useEffect(() => {
    const handleScroll = () => {
      // Show button if scrolled down more than 300px
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Add this near your other state variables at the top of the component:
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🗣️ CHUM FAQ STATE
  const [activeFAQ, setActiveFAQ] = useState('default');

  const faqContent: Record<string, string> = {
    default: "Hi! I'm Chum, your personal study buddy. Got questions about the Sanctuary? Ask away!",
    what: "StudyBuddy is a cozy, gamified productivity sanctuary designed to cure burnout and help you find your flow state.",
    garden: "Every time you finish a task, your crystal garden grows! Watch your crystals grow in your personal and customized Garden.",
    network: "The Lantern Network is our multiplayer study space! Join silent, real-time rooms with other students to stay focused together.",
    free: "The core app is 100% free forever! We also have a Luminary tier if you want to support the devs and unlock premium hats for me!"
  };

  // 🔄 AUTH CHECK (No Redirect!)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true); // Just remember they are logged in, but let them stay!
      }
    };
    checkUser();
  }, []);

  // Helper function to render tasks based on framework
  const renderTasks = () => {
    if (activeFramework === 'standard') {
      return (
        <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
          {SHOWCASE_TASKS.map(task => (
            <motion.div layout key={task.id} className="interactive-card bg-[#2B2529] border border-[#3E353B] p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:border-[#789B8C] transition-colors">
              <span className="text-[#EFE6DD] font-medium">{task.text}</span>
              <div className={`w-3 h-3 rounded-full border ${task.color} bg-current opacity-20 group-hover:opacity-100 transition-opacity`} />
            </motion.div>
          ))}
        </div>
      );
    }

    if (activeFramework === '135') {
      return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
          {['1', '3', '5'].map(size => {
            const sizeLabel = size === '1' ? '1 Big Thing' : size === '3' ? '3 Medium Things' : '5 Small Things';
            return (
              <div key={size} className="flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#A89F9A] border-b border-[#3E353B] pb-2">{sizeLabel}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SHOWCASE_TASKS.filter(t => t.size === size).map(task => (
                    <motion.div layout key={task.id} className={`interactive-card bg-[#2B2529] border border-[#3E353B] p-3 rounded-xl flex items-center text-sm ${size === '1' ? 'sm:col-span-2 p-5 text-base border-[#E8C37D]/30' : ''}`}>
                      <span className="text-[#EFE6DD]">{task.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeFramework === 'eisenhower') {
      const quadrants = [
        { title: "Do First", filter: "urgent-important", bg: "bg-red-400/5" },
        { title: "Schedule", filter: "not-urgent-important", bg: "bg-[#789B8C]/5" },
        { title: "Delegate", filter: "urgent-not-important", bg: "bg-[#CD9A5B]/5" },
        { title: "Don't Do", filter: "not-urgent-not-important", bg: "bg-[#A89F9A]/5" }
      ];

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
          {quadrants.map(q => (
            <div key={q.title} className={`p-4 rounded-2xl border border-[#3E353B] ${q.bg} min-h-[150px] flex flex-col gap-3`}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#A89F9A] mb-2">{q.title}</h4>
              {SHOWCASE_TASKS.filter(t => t.type === q.filter).map(task => (
                <motion.div layout key={task.id} className="interactive-card bg-[#2B2529] border border-[#3E353B] p-3 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-[#EFE6DD]">{task.text}</span>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (activeFramework === 'ivylee') {
      return (
        <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-4 px-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#A89F9A]">Top 6 Priority List</h4>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#141113] bg-[#E8C37D] px-3 py-1 rounded-full">
              Do #1 Until Finished
            </span>
          </div>
          {SHOWCASE_TASKS.slice(0, 6).map((task, index) => (
            <motion.div layout key={task.id} className={`interactive-card bg-[#2B2529] border ${index === 0 ? 'border-[#E8C37D] shadow-[0_0_20px_rgba(232,195,125,0.15)]' : 'border-[#3E353B] opacity-60'} p-4 rounded-xl flex items-center gap-4 transition-all duration-500`}>
              <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-[#E8C37D] text-[#141113]' : 'bg-[#141113] text-[#A89F9A] border border-[#3E353B]'}`}>
                {index + 1}
              </div>
              <span className={index === 0 ? 'text-[#EFE6DD] font-bold text-base' : 'text-[#A89F9A] text-sm line-clamp-1'}>{task.text}</span>
            </motion.div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="relative w-full bg-[#1E1A1D] text-[#EFE6DD] font-sans selection:bg-[#789B8C] selection:text-[#141113]">

      {/* ✨ CUSTOM CURSOR */}
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 rounded-full pointer-events-none z-[9999] mix-blend-screen hidden md:block"
        animate={{
          x: mousePos.x - 12,
          y: mousePos.y - 12,
          scale: isHovering ? 2 : 1,
          backgroundColor: isHovering ? "rgba(232,195,125,0.4)" : "rgba(120,155,140,0.8)",
          border: isHovering ? "1px solid rgba(232,195,125,0.8)" : "none"
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      >
        <div className="w-full h-full rounded-full blur-[4px] bg-inherit opacity-50" />
      </motion.div>

      {/* 🌌 AMBIENT PARALLAX BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: bgY }} className="absolute inset-0 opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#789B8C] mix-blend-screen filter blur-[150px] opacity-10 rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute top-[40%] right-[-10%] w-[60vw] h-[60vw] bg-[#CD9A5B] mix-blend-screen filter blur-[150px] opacity-[0.07] rounded-full animate-pulse" style={{ animationDuration: '15s' }} />
        </motion.div>
      </div>

      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 w-full h-[80px] flex justify-between items-center px-6 lg:px-[10%] bg-[#1E1A1D]/70 backdrop-blur-2xl border-b border-[#3E353B]/50 z-50">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="text-[#E8C37D] font-extrabold text-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2B2529] rounded-lg border border-[#3E353B] flex items-center justify-center shadow-[0_0_15px_rgba(232,195,125,0.1)]">
            <img
              src="/assets/favicon.png"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
          StudyBuddy
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="hidden md:flex items-center gap-8 font-medium text-sm">
          <a href="#features" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Features</a>
          <a href="#challenge" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Challenge</a>
          <a href="#faq" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">FAQ</a>
          <a href="#pricing" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Pricing</a>
          <a href="#philosophy" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Philosophy</a>
          <a href="#architects" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">About Us</a>
          <Link href="/login" className="text-[#A89F9A] hover:text-[#789B8C] transition-colors">Login</Link>
          <Link href="/register" className="relative group bg-[#E8C37D] text-[#1E1A1D] px-6 py-2.5 rounded-xl font-bold overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(232,195,125,0.4)]">
            <span className="relative z-10">Join Free</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </Link>
        </motion.div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="pt-[180px] pb-24 px-6 lg:px-[10%] grid lg:grid-cols-2 gap-16 items-center min-h-[95vh] relative z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="inline-block px-5 py-2 bg-[#CD9A5B]/10 border border-[#CD9A5B]/30 text-[#CD9A5B] rounded-full text-xs font-bold mb-6 tracking-widest uppercase shadow-[0_0_20px_rgba(205,154,91,0.1)]">
            ✨
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight">
            Focus deeper. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8C37D] to-[#CD9A5B]">Study Cozier.</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-[#A89F9A] text-lg lg:text-xl mb-10 max-w-lg leading-relaxed">
            The all-in-one sanctuary for your academic life. Forge knowledge shards, join quiet study rooms, and untangle complex ideas with your AI companion.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Link href="/register" className="group relative bg-[#789B8C] text-[#141113] px-8 py-4 rounded-2xl font-black text-center overflow-hidden hover:-translate-y-1 transition-all shadow-[0_10px_30px_rgba(120,155,140,0.2)] hover:shadow-[0_15px_40px_rgba(120,155,140,0.4)]">
              <span className="relative z-10 flex items-center justify-center gap-2">Get Started — It's Free</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </Link>
          </motion.div>
        </motion.div>

        {/* ─── HERO VISUAL (ANIMATED & EXTRAVAGANT) ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.2, ease: expoEase }}
          className="relative perspective-1000 w-full max-w-[500px] mx-auto lg:ml-auto"
        >
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="bg-[#2B2529]/80 backdrop-blur-3xl border border-[#3E353B] rounded-[2.5rem] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.6)] aspect-[4/3] flex items-center justify-center relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#789B8C]/20 via-transparent to-[#E8C37D]/10 opacity-60"></div>
            <img src="/assets/chum-ask.png" className="w-[50%] object-contain text-[#3E353B] group-hover:text-[#789B8C] group-hover:scale-110 transition-all duration-700 ease-out relative z-10" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border border-white/5 rounded-[2.5rem] border-dashed pointer-events-none" />

            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -left-8 bg-[#141113]/90 backdrop-blur-md border border-[#789B8C]/50 px-6 py-4 rounded-2xl font-bold text-sm flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-10"
            >
              <motion.span
                animate={{ boxShadow: ["0 0 0 0 rgba(120,155,140,0.6)", "0 0 0 15px rgba(120,155,140,0)", "0 0 0 0 rgba(120,155,140,0)"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="w-3 h-3 bg-[#789B8C] rounded-full"
              />

            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── STATS BAR ─── */}
      <motion.section
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-3 bg-[#141113]/80 backdrop-blur-lg border-y border-[#3E353B]/50 text-center py-16 px-6 lg:px-[10%] gap-8 relative z-10"
      >

      </motion.section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-32 px-6 lg:px-[10%] space-y-40 relative z-10">
        {/* FEATURE 1: HYBRID AI */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-200px" }} variants={containerVariants} className="grid lg:grid-cols-2 gap-16 items-center">


          <motion.div variants={itemVariants} className="bg-[#141113] border border-[#3E353B] rounded-[2.5rem] aspect-square lg:aspect-video shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#789B8C]/10 to-transparent z-0" />
            <div className="absolute inset-0 flex flex-col p-6 lg:p-10 gap-4 justify-center z-10">
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="self-end bg-[#789B8C]/20 border border-[#789B8C]/30 text-[#EFE6DD] px-5 py-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%] shadow-lg">
                Can you explain the Pomodoro technique?
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="self-start bg-[#2B2529] border border-[#3E353B] text-[#A89F9A] px-5 py-4 rounded-2xl rounded-tl-sm text-sm max-w-[85%] flex flex-col gap-3 shadow-xl">
                <div className="flex gap-2 items-center text-[#E8C37D] font-bold"><Sparkles size={14} /> Chum</div>
                <p>Absolutely! It's a study method where you focus for 25 minutes, then take a 5-minute break. Want me to start a timer for you?</p>
              </motion.div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <span className="text-[#CD9A5B] font-extrabold text-sm tracking-widest uppercase mb-4 flex items-center gap-2"><Cpu size={16} /> Chum</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Study with a Friend.</h2>
            <p className="text-[#A89F9A] text-lg leading-relaxed mb-6">
              Meet <strong>Chum</strong>, your AI companion. Powered by a lightning-fast cloud network out of the box, Chum helps you untangle complex nodes and forge knowledge shards instantly.
            </p>
          </motion.div>
        </motion.div>

        {/* FEATURE 3: LIVE 3D CRYSTAL GARDEN SHOWCASE */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-200px" }}
          variants={containerVariants}
          className="grid lg:grid-cols-2 gap-16 items-center mt-32"
        >
          {/* LEFT: Text Content (Matches your other snippets) */}
          <motion.div variants={itemVariants}>
            <span className="text-[#789B8C] font-extrabold text-sm tracking-widest uppercase mb-4 flex items-center gap-2">
              <Sparkles size={16} /> Crystal Garden
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">
              Turn your focus into <span className="text-[#789B8C]">tangible growth.</span>
            </h2>
            <p className="text-[#A89F9A] text-lg leading-relaxed mb-8">
              Experience the <strong>Crystal Garden</strong>. Every minute of deep work fuels the growth of your personal Geode. Watch as your focus score manifests into an evolving crystalline sanctuary.
            </p>
          </motion.div>

          {/* RIGHT: The Actual 3D Scene */}
          <motion.div variants={itemVariants} className="bg-[#111] border-2 border-[#3E353B] rounded-[2.5rem] p-3 shadow-[0_0_50px_rgba(120,155,140,0.15)] group relative">

            {/* 3D Scene Wrapper */}
            <div className="relative w-full aspect-video bg-[#05080c] rounded-[1.8rem] overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] border border-white/5">

              {/* The Header Overlay (Matches your Screenshot) */}
              <div className="absolute top-6 left-6 z-10 pointer-events-none">
              </div>

              {/* 🟢 THE 3D CANVAS INTEGRATION 🟢 */}
              <div className="w-full h-full">
                <GeodeScene completionRatio={0.96} />
              </div>

              {/* Interaction Hint */}
              <div className="absolute bottom-6 left-6 z-10">
                <div className="bg-black/40 backdrop-blur-md text-white/50 px-3 py-1.5 rounded-lg text-[9px] font-bold border border-white/5 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#789B8C] animate-pulse" />
                  Interact to explore
                </div>
              </div>
            </div>

            {/* Premium Decorative Glow */}
            <div className="absolute -inset-4 bg-[#789B8C]/5 blur-[100px] rounded-full pointer-events-none -z-10 group-hover:bg-[#789B8C]/10 transition-all duration-700" />
          </motion.div>
        </motion.div>



        {/* FEATURE 2: LANTERN NETWORK (Polished Alignment) */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-200px" }} variants={containerVariants} className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={itemVariants} className="order-2 lg:order-1 bg-[#05080c] border border-[#3E353B] rounded-[2.5rem] aspect-square lg:aspect-video shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

              {/* ✨ ANIMATED PATHS: Coordinates now match the node centers exactly */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                {/* Line: Cyan (25,30) to Purple (70,70) */}
                <motion.line
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  x1="25%" y1="30%" x2="70%" y2="70%"
                  stroke="#00ffff" strokeWidth="1.5" strokeDasharray="4 4"
                />
                {/* Line: Cyan (25,30) to Yellow (85,50) */}
                <motion.line
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  x1="25%" y1="30%" x2="85%" y2="50%"
                  stroke="#ffcc00" strokeWidth="1.5" strokeDasharray="4 4"
                />
              </svg>

              {/* ✨ ANIMATED NODES: Centered using negative translate to ensure pivot point alignment */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute w-5 h-5 bg-[#00ffff] rounded-full shadow-[0_0_30px_#00ffff] -translate-x-1/2 -translate-y-1/2"
                style={{ top: '30%', left: '25%' }}
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
                transition={{ repeat: Infinity, duration: 4, delay: 1 }}
                className="absolute w-4 h-4 bg-[#c084fc] rounded-full shadow-[0_0_20px_#c084fc] -translate-x-1/2 -translate-y-1/2"
                style={{ top: '70%', left: '70%' }}
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                className="absolute w-3 h-3 bg-[#ffcc00] rounded-full shadow-[0_0_15px_#ffcc00] -translate-x-1/2 -translate-y-1/2"
                style={{ top: '50%', left: '85%' }}
              />

              {/* ✨ LIVE STATUS: Pulsing indicator */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="absolute bottom-6 left-6 bg-[#111111]/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-[#00ffff] rounded-full animate-ping" />
                <div className="flex flex-col">
                  <div className="text-xs font-black text-white mb-0.5 uppercase tracking-tighter">Architect's Sanctuary</div>
                  <div className="text-[10px] text-[#00ffff] tracking-widest uppercase font-bold">● FlowState Active</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="order-1 lg:order-2">
            <span className="text-[#E8C37D] font-extrabold text-sm tracking-widest uppercase mb-4 flex items-center gap-2"><Sparkles size={16} /> Lantern Network</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Study alone, together.</h2>
            <p className="text-[#A89F9A] text-lg leading-relaxed">
              Drop into the 3D Void and see other scholars in deep work. Join real-time Sanctuaries, share ambient focus timers, and feel the presence of a quiet library from anywhere.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── NEW: INTERACTIVE FRAMEWORK MORPH ─── */}
      <section className="py-24 px-6 lg:px-[10%] relative z-10">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={containerVariants} className="bg-[#141113] border border-[#3E353B] rounded-[3rem] p-8 lg:p-16 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-12 relative z-10">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">Adapt to your brain's framework.</h2>
            <p className="text-[#A89F9A] text-lg">Click a framework below to see how StudyBuddy automatically reshapes your workload.</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-4 mb-12 relative z-10">
            {[
              { id: 'standard', icon: <LayoutList size={18} />, label: "Standard List" },
              { id: '135', icon: <ListOrdered size={18} />, label: "1-3-5 Rule" },
              { id: 'eisenhower', icon: <Grid2X2 size={18} />, label: "Eisenhower Matrix" },
              { id: 'ivylee', icon: <ListChecks size={18} />, label: "Ivy Lee Method" }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActiveFramework(btn.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeFramework === btn.id ? 'bg-[#789B8C] text-[#141113] shadow-[0_0_20px_rgba(120,155,140,0.4)]' : 'bg-[#2B2529] text-[#A89F9A] hover:bg-[#3E353B]'}`}
              >
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>

          {/* Morphing Container */}
          <div className="min-h-[400px] relative z-10 bg-[#1E1A1D] border border-[#3E353B] rounded-2xl p-6 lg:p-10">
            <AnimatePresence mode="popLayout">
              {renderTasks()}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* ─── PROBLEM & SOLUTION ─── */}
      <section id="challenge" className="py-24 px-6 lg:px-[10%] bg-[#141113] text-center border-t border-[#3E353B] relative z-10">
        <div className="inline-block px-4 py-1.5 border border-red-400/20 bg-red-400/5 text-red-400 rounded-full text-xs font-bold mb-6 tracking-wide uppercase">
          The Challenge
        </div>
        <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">The Battle for <span className="text-[#789B8C]">Deep Focus.</span></h2>
        <p className="text-[#A89F9A] text-lg max-w-2xl mx-auto mb-16">
          Surviving the academic week means fighting through constant notifications, overlapping deadlines, and a chronic sense of exhaustion.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {[
            { icon: "⏳", title: "Deadline Paralysis", desc: "Finding it almost impossible to focus when multiple assignments and projects are due at the exact same time." },
            { icon: "📱", title: "Constant Distractions", desc: "Digital noise and interruptions pull you out of your flow state, making it incredibly hard to finish academic tasks on time." },
            { icon: "🥀", title: "Daily Overwhelm", desc: "Feeling chronically stressed, burned out, and overwhelmed by the sheer volume of daily academic requirements." }
          ].map((item, i) => (
            <div key={i} className="bg-red-400/5 border border-red-400/10 p-8 rounded-3xl text-left">
              <span className="text-4xl mb-6 block">{item.icon}</span>
              <h4 className="text-red-400 font-bold text-xl mb-4">{item.title}</h4>
              <p className="text-[#A89F9A] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={containerVariants} className="bg-[#2B2529] border border-[#3E353B] rounded-[3rem] p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-12 shadow-2xl text-left relative overflow-hidden max-w-6xl mx-auto">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#789B8C]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex-1 relative z-10">
            <div className="inline-block px-4 py-1.5 border border-[#789B8C]/30 bg-[#789B8C]/10 text-[#789B8C] rounded-full text-xs font-bold mb-6 tracking-wide uppercase">
              The Solution
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Meet your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#789B8C] to-[#E8C37D]">Study Sanctuary.</span></h2>
            <p className="text-[#A89F9A] text-lg mb-8 leading-relaxed">
              StudyBuddy fixes the friction by unifying your workflow into a single, private, and cozy ecosystem.
            </p>
            <ul className="space-y-4">
              {[
                { title: "Unified Hub:", desc: "Canvas, Garden, and Archive in one tab." },
                { title: "Local Intelligence:", desc: "AI that runs on your hardware via Ollama." },
                { title: "Gamified Peace:", desc: "Turning stress into 'Quest Seeds' and Crystals." }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Sparkles size={20} className="text-[#789B8C] shrink-0 mt-1" />
                  <p className="text-[#A89F9A]"><strong className="text-[#EFE6DD]">{item.title}</strong> {item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:w-1/3 flex justify-center relative z-10">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <CheckCircle2 size={120} strokeWidth={1} className="text-[#789B8C] drop-shadow-[0_0_30px_rgba(120,155,140,0.4)]" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── ASK CHUM (INTERACTIVE FAQ) ─── */}
      <section id="faq" className="py-24 px-6 lg:px-[10%] relative z-10 bg-[#1E1A1D] border-t border-[#3E353B]">

        {/* 1. Header Block (Full Width at Top) */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <div className="inline-block px-4 py-1.5 border border-[#789B8C]/30 bg-[#789B8C]/10 text-[#789B8C] rounded-full text-xs font-bold mb-6 tracking-widest uppercase">
            Got Questions?
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Ask <span className="text-[#789B8C]">Chum.</span></h2>
          <p className="text-[#A89F9A] text-lg max-w-2xl mx-auto">
            Your personal study buddy is here to help you navigate the Sanctuary. Tap a question below!
          </p>
        </div>

        {/* 2. Interaction Hub (The Bubble & Buttons Row) */}
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">

          {/* Chum Avatar & Chat Bubble */}
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start relative">

            {/* The Chat Bubble */}
            <div className="bg-[#2B2529] border border-[#3E353B] rounded-3xl rounded-bl-none p-6 md:p-8 shadow-xl relative mb-6 w-full min-h-[140px] flex items-center">
              {/* ✨ Updated Triangle: Centered and pointing directly at Chum */}
              <div className="absolute -bottom-3 left-1/5 -translate-x-1/2 w-6 h-6 bg-[#2B2529] border-b border-r border-[#3E353B] rotate-[45deg] z-0"></div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeFAQ}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="text-[#EFE6DD] text-lg leading-relaxed font-medium"
                >
                  "{faqContent[activeFAQ]}"
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Chum Avatar */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 ml-4 bg-[#141113] rounded-full border-[4px] border-[#789B8C] shadow-[0_0_30px_rgba(120,155,140,0.3)] flex items-center justify-center text-6xl"
            >
              <img src="/assets/chum-ask.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          {/* Question Buttons (Now 2 Columns on Desktop) */}
          <div className="w-full md:w-1/2 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={20} className="text-[#A89F9A]" />
              <h3 className="text-[#A89F9A] font-bold text-sm tracking-widest uppercase">Ask a Question</h3>
            </div>

            {/* 👇 The Grid Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'what', label: "What exactly is StudyBuddy?" },
                { id: 'garden', label: "How does the Crystal Garden work?" },
                { id: 'network', label: "What is the Lantern Network?" },
                { id: 'free', label: "Is the app really free?" },
                // 👇 Placeholder Questions
                { id: 'forge', label: "What is The Forge?" },
                { id: 'chum', label: "Who is Chum?" },
                { id: 'security', label: "Is my data safe?" },
                { id: 'coming-soon', label: "What's coming next?" }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveFAQ(btn.id)}
                  className={`text-left px-4 py-4 rounded-xl font-bold text-sm transition-all duration-300 border ${activeFAQ === btn.id
                    ? 'bg-[#789B8C] text-[#141113] border-[#789B8C] shadow-[0_0_20px_rgba(120,155,140,0.3)] scale-[1.02]'
                    : 'bg-[#2B2529] text-[#A89F9A] border-[#3E353B] hover:border-[#789B8C]/50 hover:bg-[#3E353B]'
                    }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-6 lg:px-[10%] relative z-10">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={containerVariants} className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 border border-[#789B8C]/30 bg-[#789B8C]/10 text-[#789B8C] rounded-full text-xs font-bold mb-6 tracking-widest uppercase">
              Simple Pricing
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-4xl lg:text-5xl font-extrabold mb-6">Invest in your <span className="text-[#E8C37D]">Sanctuary.</span></motion.h2>
            <motion.p variants={itemVariants} className="text-[#A89F9A] text-lg max-w-2xl mx-auto">
              Start for free, and upgrade when you're ready to unlock exclusive cosmetics and deep focus analytics.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Free Tier */}
            <motion.div variants={itemVariants} className="bg-[#141113] border border-[#3E353B] p-10 rounded-[2.5rem] flex flex-col relative overflow-hidden group">
              <h3 className="text-2xl font-bold text-[#EFE6DD] mb-2">The Scholar</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-[#EFE6DD]">₱0</span>
                <span className="text-[#A89F9A] font-medium">/ forever</span>
              </div>
              <p className="text-[#A89F9A] mb-8 leading-relaxed">Everything you need to defeat deadline paralysis and find your flow state.</p>
              <ul className="space-y-4 mb-10 flex-1">
                {['Access to the Lantern Network', 'Standard Crystal Garden', 'Basic Task Morpher', 'Default Chum Companion'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#EFE6DD] text-sm">
                    <CheckCircle2 size={18} className="text-[#789B8C]" /> {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center w-full py-4 rounded-xl font-bold border border-[#3E353B] text-[#EFE6DD] hover:bg-[#3E353B] transition-colors">
                Start for Free
              </Link>
            </motion.div>

            {/* Premium Tier */}
            <motion.div variants={itemVariants} className="bg-[#2B2529] border border-[#E8C37D]/50 p-10 rounded-[2.5rem] flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(232,195,125,0.1)] group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#E8C37D] blur-[100px] opacity-20 pointer-events-none" />
              <div className="absolute top-8 right-8 px-4 py-1.5 bg-[#E8C37D]/20 text-[#E8C37D] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#E8C37D]/30">
                Most Popular
              </div>

              <h3 className="text-2xl font-bold text-[#E8C37D] mb-2">The Luminary</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-[#E8C37D]">₱149</span>
                <span className="text-[#A89F9A] font-medium">/ month</span>
              </div>
              <p className="text-[#A89F9A] mb-8 leading-relaxed">Unlock premium aesthetics, exclusive wardrobe drops, and advanced analytics.</p>
              <ul className="space-y-4 mb-10 flex-1">
                {['Premium Hats & Clips for Chum', 'Exclusive Solarpunk Garden Seeds', 'Deep Focus Analytics History', 'Priority Lantern Network Rooms'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#EFE6DD] text-sm">
                    <Sparkles size={18} className="text-[#E8C37D]" /> {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 rounded-xl font-bold bg-[#E8C37D] text-[#141113] hover:shadow-[0_0_20px_rgba(232,195,125,0.4)] transition-all">
                Upgrade to Luminary
              </button>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* ─── PHILOSOPHY / ABOUT SECTION ─── */}
      <motion.section id="philosophy" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={containerVariants} className="py-32 px-6 lg:px-[10%] bg-gradient-to-b from-[#141113] to-[#1E1A1D] text-center border-t border-[#3E353B] relative z-10">
        <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 border border-[#789B8C]/30 bg-[#789B8C]/10 text-[#789B8C] rounded-full text-xs font-bold mb-6 tracking-widest uppercase">
          The Philosophy
        </motion.div>
        <motion.h2 variants={itemVariants} className="text-4xl lg:text-5xl font-extrabold mb-6 max-w-3xl mx-auto leading-tight">
          A Living Workspace for the <span className="text-[#CD9A5B]">Digital Nomad.</span>
        </motion.h2>
        <motion.p variants={itemVariants} className="text-[#A89F9A] text-lg max-w-2xl mx-auto mb-20 leading-relaxed">
          Most tools are built for sterile offices. StudyBuddy was built for the late-night tea drinkers, the creative thinkers, and the students who need a sanctuary, not just a list.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            { icon: <Leaf size={32} />, title: "Zero-Burnout Architecture", desc: "Environment-driven design that prioritizes your mental well-being and reduces digital eye-strain." },
            { icon: <Shield size={32} />, title: "Privacy by Default", desc: "Your thoughts aren't products. With hybrid local AI integration, your data stays in your control." }
          ].map((item, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -10 }} transition={springTransition} className="bg-[#2B2529] border border-[#3E353B] p-10 rounded-3xl text-left hover:border-[#789B8C]/50 shadow-xl group cursor-default">
              <div className="text-[#789B8C] mb-6 bg-[#141113] w-16 h-16 rounded-2xl flex items-center justify-center border border-[#3E353B] group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
              <h3 className="text-[#E8C37D] font-bold text-2xl mb-4">{item.title}</h3>
              <p className="text-[#A89F9A] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── THE ARCHITECTS / ABOUT US ─── */}
      <section id="architects" className="py-24 px-6 lg:px-[10%] bg-[#1E1A1D] text-center relative z-10 border-t border-[#3E353B]">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={containerVariants}>
          <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 border border-[#CD9A5B]/30 bg-[#CD9A5B]/10 text-[#CD9A5B] rounded-full text-xs font-bold mb-6 tracking-widest uppercase">
            The Architects
          </motion.div>
          <motion.h2 variants={itemVariants} className="text-4xl lg:text-5xl font-extrabold mb-6">Built by <span className="text-[#789B8C]">Students</span>, for <span className="text-[#E8C37D]">Students.</span></motion.h2>
          <motion.p variants={itemVariants} className="text-[#A89F9A] text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
            StudyBuddy was born out of necessity for our SHS Business Simulation. We were tired of sterile productivity tools that induced burnout, so we built a sanctuary instead.
          </motion.p>

          <div className="flex flex-wrap justify-center gap-8 max-w-5xl mx-auto">

            {/* Team Member 1 */}
            <motion.div variants={itemVariants} whileHover={{ y: -10 }} transition={springTransition} className="bg-[#2B2529] border border-[#3E353B] rounded-[2rem] p-8 w-full md:w-[calc(50%-2rem)] lg:w-[calc(33.333%-2rem)] text-center hover:border-[#789B8C]/50 transition-colors group shadow-xl">
              <div className="w-24 h-24 mx-auto bg-[#141113] rounded-full border border-[#3E353B] group-hover:border-[#789B8C] group-hover:shadow-[0_0_20px_rgba(120,155,140,0.3)] transition-all duration-500 mb-6 flex items-center justify-center text-4xl">
                <img
                  src="/assets/devs/mark-chum.png"
                  alt="Lead Developer"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-[#EFE6DD] mb-1">Lead Developer</h3>
              <p className="text-[#789B8C] text-xs font-bold uppercase tracking-widest mb-4">System Architect</p>
              <p className="text-[#A89F9A] text-sm leading-relaxed">Turning chaotic code into lightning-fast performance and building the unbreakable system architecture, bringing the whole StudyBuddy to life.</p>
            </motion.div>

            {/* Team Member 2 */}
            <motion.div variants={itemVariants} whileHover={{ y: -10 }} transition={springTransition} className="bg-[#2B2529] border border-[#3E353B] rounded-[2rem] p-8 w-full md:w-[calc(50%-2rem)] lg:w-[calc(33.333%-2rem)] text-center hover:border-[#E8C37D]/50 transition-colors group shadow-xl">
              <div className="w-24 h-24 mx-auto bg-[#141113] rounded-full border border-[#3E353B] group-hover:border-[#E8C37D] group-hover:shadow-[0_0_20px_rgba(232,195,125,0.3)] transition-all duration-500 mb-6 relative overflow-hidden">
                <img
                  src="/assets/devs/sia-chum.png"
                  alt="UI/UX Designer"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-[#EFE6DD] mb-1">UI/UX Designer</h3>
              <p className="text-[#E8C37D] text-xs font-bold uppercase tracking-widest mb-4">Visual Alchemist</p>
              <p className="text-[#A89F9A] text-sm leading-relaxed">Turning stressful tasks into glowing crystals and designing the cozy sanctuary aesthetic, and bringing Chum to life.</p>
            </motion.div>

            {/* Team Member 3 (The Paper & Research Squad) */}
            <motion.div variants={itemVariants} whileHover={{ y: -10 }} transition={springTransition} className="bg-[#2B2529] border border-[#3E353B] rounded-[2rem] p-8 w-full md:w-[calc(50%-2rem)] lg:w-[calc(33.333%-2rem)] text-center hover:border-[#CD9A5B]/50 transition-colors group shadow-xl">
              <div className="w-24 h-24 mx-auto bg-[#141113] rounded-full border border-[#3E353B] group-hover:border-[#CD9A5B] group-hover:shadow-[0_0_20px_rgba(205,154,91,0.3)] transition-all duration-500 mb-6 flex items-center justify-center text-4xl">
                <img
                  src="/assets/devs/paper-chum.png"
                  alt="Research & Strategy"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-[#EFE6DD] mb-1">Research & Strategy</h3>
              <p className="text-[#CD9A5B] text-xs font-bold uppercase tracking-widest mb-4">Business Simulation Team</p>
              <p className="text-[#A89F9A] text-sm leading-relaxed">A dedicated squad of four managing the thesis, market research, financial planning, and project documentation.</p>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-32 pb-12 text-center border-t border-[#3E353B] bg-[#141113] relative overflow-x-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E8C37D] blur-[150px] opacity-[0.03] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-10 text-[#EFE6DD]">Ready to find your focus?</h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={springTransition}>
            <Link href="/register" className="inline-block bg-[#E8C37D] text-[#1E1A1D] px-12 py-5 rounded-2xl font-black text-xl hover:bg-[#d6b068] hover:shadow-[0_0_40px_rgba(232,195,125,0.4)] transition-all">
              Start Your Adventure
            </Link>
          </motion.div>
          <p className="mt-24 text-[#A89F9A] text-sm font-medium">
            &copy; 2025 StudyBuddy.
          </p>
        </div>
      </footer>

      {/* ⬆️ FLOATING SCROLL TO TOP BUTTON (BOTTOM LEFT) */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-[100] bg-[#2B2529] border border-[#3E353B] text-[#EFE6DD] p-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:bg-[#789B8C] hover:text-[#141113] hover:border-[#789B8C] transition-colors group"
            aria-label="Scroll to top"
          >
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}