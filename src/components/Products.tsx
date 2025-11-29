import React from "react";
import { motion } from "framer-motion";
import {
  FaRobot,
  FaMicrophoneAlt,
  FaPhoneAlt,
  FaUserAstronaut,
  FaMagic,
  FaChartLine,
} from "react-icons/fa";

type ProductItem = {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent?: string;
};

const items: ProductItem[] = [
  {
    id: "chatbot",
    title: "Intelligent Chatbot",
    desc: "AI assistant for 24/7 customer support — intent-aware, contextful and persistent sessions.",
    icon: <FaRobot />,
    accent: "from-red-400 to-orange-400",
  },
  {
    id: "website-voice",
    title: "Website VoiceBot",
    desc: "Hands-free navigation & voice-driven UI that converts visitors into customers.",
    icon: <FaMicrophoneAlt />,
    accent: "from-rose-400 to-fuchsia-500",
  },
  {
    id: "call-voice",
    title: "Call VoiceBot",
    desc: "Automated calls with natural TTS voices, DTMF handling, and seamless agent handoffs.",
    icon: <FaPhoneAlt />,
    accent: "from-amber-400 to-yellow-400",
  },
  {
    id: "avatar",
    title: "Avatar VoiceBot",
    desc: "Engaging talking avatars + lip-sync for immersive customer journeys and demos.",
    icon: <FaUserAstronaut />,
    accent: "from-sky-400 to-indigo-500",
  },
  {
    id: "flow-studio",
    title: "Flow Studio",
    desc: "No-code visual flow editor — rapid prototyping, branching logic, and API integrations.",
    icon: <FaMagic />,
    accent: "from-emerald-400 to-teal-400",
  },
  {
    id: "analytics",
    title: "Realtime Analytics",
    desc: "Conversation insights, funnel tracking and SLA monitoring to optimize bot performance.",
    icon: <FaChartLine />,
    accent: "from-pink-400 to-rose-400",
  },
];

const container = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.06, delayChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
  hover: { scale: 1.03, y: -6, transition: { type: "spring", stiffness: 300 } },
};

export default function Products(): JSX.Element {
  return (
    <section className="w-full py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Our <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">Products</span>
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            Powerful AI building blocks — pick one or combine them to create omnichannel experiences that scale.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((it) => (
            <motion.div
              key={it.id}
              variants={cardVariants}
              whileHover="hover"
              className="relative rounded-2xl p-6 overflow-hidden border border-slate-700 bg-gradient-to-b from-slate-800/60 to-slate-900/60 shadow-md hover:shadow-2xl transition-shadow duration-300"
            >
              {/* decorative glow */}
              <div
                className={`absolute -left-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${it.accent}`}
                aria-hidden
              />

              {/* content */}
              <div className="relative z-10 flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br ${it.accent} text-white shadow-lg`}>
                    {it.icon}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{it.title}</h3>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">{it.desc}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800/40 border border-slate-700 text-white transition"
                      onClick={() => {
                        // optional: navigate or open modal; leave as placeholder
                        void 0;
                      }}
                    >
                      Learn More →
                    </button>

                    <div className="text-xs text-slate-400">Trusted • Scalable</div>
                  </div>
                </div>
              </div>

              {/* bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-40" />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 rounded-2xl bg-gradient-to-r from-slate-800/40 to-slate-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div>
            <h4 className="text-xl font-semibold text-white">Want a custom demo?</h4>
            <p className="text-slate-400 text-sm">Tell us your use-case — we'll show a tailored flow and pricing.</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              className="inline-flex items-center px-5 py-3 rounded-lg bg-gradient-to-br from-red-500 to-orange-400 text-white font-medium shadow-xl hover:scale-[1.01] transition-transform"
              onClick={() => {
                // placeholder: set modal or navigate to Contact
                void 0;
              }}
            >
              Book a Demo
            </button>

            <button
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
              onClick={() => {
                // placeholder: navigate to pricing
                void 0;
              }}
            >
              View Pricing
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
