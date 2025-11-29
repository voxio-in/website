import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Choose Your Solution",
    desc: "Select the AI assistant that fits your needs: Chatbot, VoiceBot, or Avatar.",
  },
  {
    number: "2",
    title: "Customize & Integrate",
    desc: "Easily customize the appearance and integrate with your website or platform using our simple code snippet.",
  },
  {
    number: "3",
    title: "Deploy & Automate",
    desc: "Deploy your AI assistant and start automating customer interactions, lead generation, and more.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function HowItWorks() {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      {/* Background Glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(239,68,68,0.3), transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Heading */}
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-extrabold text-white text-center font-sora"
        >
          How It{" "}
          <span className="bg-gradient-to-r from-red-500 to-orange-400 text-transparent bg-clip-text">
            Works
          </span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 1 }}
          className="text-slate-400 text-lg md:text-xl text-center max-w-2xl mx-auto mt-4 font-sora"
        >
          Effortlessly integrate our AI solutions into your existing workflows.
        </motion.p>

        {/* Steps with horizontal line */}
        <div className="relative mt-24 flex justify-between items-start">
          {/* Horizontal Line */}
          <div className="absolute top-10 left-16 right-16 h-1 bg-gradient-to-r from-red-500 to-orange-400 opacity-30 z-0 rounded-full"></div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="flex flex-col items-center text-center relative z-10 w-1/4"
            >
              {/* Number Circle */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-400 border-4 border-black flex items-center justify-center text-2xl font-bold text-white font-sora mb-8">
                {step.number}
              </div>

              {/* Card */}
              <div className="bg-[#0d0d0d] rounded-2xl p-8 border border-white/10 hover:border-red-500/40 hover:shadow-[0_0_25px_rgba(255,70,70,0.3)] transition-all">
                <h3 className="text-2xl font-bold text-white mb-3 font-sora">
                  {step.title}
                </h3>
                <p className="text-slate-400 text-base leading-relaxed font-sora">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
