import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Products from './components/Products';
import HowItWorks from './components/How-it-works';
import "@fontsource/sora/300.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";


// --- Types ---

interface GradientButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    isOutline?: boolean;
}

interface FeatureCardProps {
    icon: string;
    title: string;
    description: string;
}

// Define the possible page paths for type safety
type Page = 'Home' | 'Features' | 'SDKs' | 'Pricing' | 'Docs' | 'Contact';

interface NavbarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

interface CodeBlockProps {
    language: string;
    code: string;
}

interface PricingTier {
    name: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    isPrimary: boolean;
}

// --- Utility Functions and Icons ---

const Logo: React.FC = () => (
    <div className="flex items-center text-2xl font-bold tracking-tight text-white">
        <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Main Circle (Voice/AI) */}
            <circle cx="12" cy="12" r="10" fill="url(#grad4)" />
            {/* Waveform/Bot Icon */}
            <path d="M7 12H8V16H7V12ZM11 8H12V16H11V8ZM15 10H16V14H15V10Z" fill="#FDBA74" />
            <defs>
                <linearGradient id="grad4" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#EF4444" /> {/* Red stop */}
                    <stop offset="1" stopColor="#F97316" /> {/* Orange stop */}
                </linearGradient>
            </defs>
        </svg>
        <span className="bg-gradient-to-r from-red-500 to-orange-400 text-transparent bg-clip-text">
            Voxio.AI
        </span>
    </div>
);

// Framer Motion Variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

// --- Reusable UI Components ---

const GradientButton: React.FC<GradientButtonProps> = ({ children, onClick, className = '', isOutline = false }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium rounded-lg group transition duration-300 ${className}`}
        onClick={onClick}
    >
        <span className="absolute inset-0 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg group-hover:from-red-700 group-hover:to-orange-700 transition duration-300"></span>
        <span className={`relative px-6 py-3 transition-all ease-in duration-100 rounded-md group-hover:bg-opacity-0 ${isOutline ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white'}`}>
            {children}
        </span>
    </motion.button>
);

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <motion.div
        variants={itemVariants}
        className="glassmorphism-card p-6 rounded-xl border border-slate-700 hover:border-red-500 transition-all duration-300"
    >
        <div className="text-orange-400 mb-4 text-3xl">{icon}</div>
        <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
    </motion.div>
);

// --- Global Components ---

const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage }) => {
    const navItems = [
        { name: 'Omnichannel', path: 'Features' as Page },
        { name: 'Flow Studio', path: 'SDKs' as Page },
        { name: 'Pricing', path: 'Pricing' as Page },
        { name: 'Docs', path: 'Docs' as Page },
    ];

    return (
        <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <button onClick={() => setCurrentPage('Home')} className="focus:outline-none">
                        <Logo />
                    </button>
                    <div className="flex items-center">
                        <div className="hidden md:flex space-x-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => setCurrentPage(item.path)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                                        currentPage === item.path
                                            ? 'text-red-400 bg-slate-800'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                    }`}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        <GradientButton className="ml-6 hidden lg:inline-flex" onClick={() => setCurrentPage('Contact')}>
                            Book a Demo
                        </GradientButton>
                    </div>
                </div>
            </div>
        </nav>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div>
                    <h5 className="font-semibold text-white mb-4">Product</h5>
                    <ul className="space-y-3 text-sm">
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Flow Studio</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Omnichannel API</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">NLP Engine</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Analytics</li>
                    </ul>
                </div>
                <div>
                    <h5 className="font-semibold text-white mb-4">Channels</h5>
                    <ul className="space-y-3 text-sm">
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">WhatsApp</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Voice/IVR</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Web/App Chat</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">SMS & Email</li>
                    </ul>
                </div>
                <div>
                    <h5 className="font-semibold text-white mb-4">Company</h5>
                    <ul className="space-y-3 text-sm">
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">About VoxDev</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Careers</li>
                        <li className="text-slate-400 hover:text-orange-400 cursor-pointer transition-colors duration-200">Privacy Policy</li>
                    </ul>
                </div>
                <div>
                    <h5 className="font-semibold text-white mb-4">Build Your Bot</h5>
                    <p className="text-slate-400 text-sm mb-4">Start with our drag-and-drop studio today.</p>
                    <GradientButton isOutline className="w-full text-xs">
                        View Sandbox
                    </GradientButton>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800">
                <Logo />
                <p className="mt-4 md:mt-0 text-xs text-slate-500">
                    &copy; {new Date().getFullYear()} VoxDev. All rights reserved. Conversational AI, simplified.
                </p>
            </div>
        </div>
    </footer>
);

// --- Page Components ---

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => (
    <div className="bg-slate-800 rounded-xl p-4 md:p-6 overflow-x-auto shadow-2xl shadow-red-500/10 text-xs md:text-sm">
        <div className="flex justify-between items-center mb-3">
            <span className="text-red-400 font-mono uppercase text-xs tracking-wider">{language}</span>
            <span className="text-slate-500 text-xs">// Bot Initialization Example</span>
        </div>
        <pre className="text-slate-200 font-mono whitespace-pre-wrap">
            {code}
        </pre>
    </div>
);

const HomePage: React.FC = () => (
    <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="pt-20 bg-slate-900"
    >
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 md:pt-36 md:pb-24 text-center relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 z-0 opacity-10"
                style={{
                    background: 'radial-gradient(circle at 50% 10%, rgba(239, 68, 68, 0.4), transparent 50%)', // Red glow
                }}
            />
          <motion.h1
    variants={itemVariants}
    className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.15] relative z-10 font-sora tracking-tight"
>
    Automate Customer Conversations with{" "}
    <span className="bg-gradient-to-r from-red-500 to-orange-400 text-transparent bg-clip-text font-sora">
        Human-Like AI Assistants.
    </span>
</motion.h1>

<motion.p
    variants={itemVariants}
    className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 relative z-10 font-sora leading-relaxed"
>
    Deliver instant responses, intelligent support, and natural voice interactions—across your
    website, WhatsApp, and phone calls. No wait times. No manual effort. Just smarter automation
    that scales with you 24/7.
</motion.p>


            <motion.div variants={itemVariants} className="flex justify-center space-x-4 relative z-10">
                <GradientButton className="text-lg">Start Building (No-Code)</GradientButton>
                <GradientButton className="text-lg border-2 border-red-500/50 hover:border-orange-400 bg-slate-900" isOutline>
                    Try Flow Studio
                </GradientButton>
            </motion.div>
        </div>

        {/* Omnichannel Showcase Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div variants={itemVariants} className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">
                    Omnichannel <span className="text-orange-400">Reach</span>
                </h2>
                <p className="text-slate-400 max-w-xl mx-auto">Deploy a single bot definition across all your customer touchpoints.</p>
            </motion.div>
            <motion.div variants={itemVariants} className="flex justify-center items-center space-x-6 mb-12">
                {/* Simulated Channel Icons using Emojis/SVGs */}
                {['💬', '📱', '📞', '🤖', '🌐'].map((icon, index) => (
                    <motion.div
                        key={index}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="p-4 bg-slate-800 rounded-full border border-slate-700 text-4xl shadow-lg shadow-red-500/10 hover:shadow-red-500/40 transition duration-300 cursor-pointer"
                        title={['WhatsApp', 'SMS', 'IVR/Voice', 'Facebook Messenger', 'Web Chat'][index]}
                    >
                        {icon}
                    </motion.div>
                ))}
            </motion.div>
            <motion.div variants={itemVariants}>
                <CodeBlock
                    language="Node.js Integration"
                    code={`
// 1. Initialize the VoxDev AI Client
const voxClient = VoxDev.init({
    apiKey: 'YOUR_API_KEY',
    secret: process.env.VOX_SECRET
});

// 2. Process a new inbound message (e.g., from a WhatsApp webhook)
app.post('/webhook/whatsapp', async (req, res) => {
    const { from, message } = req.body;
    
    // Send message to the Flow Studio Engine for NLP and processing
    const response = await voxClient.flow.processMessage({
        channel: 'whatsapp',
        userId: from,
        text: message
    });
    
    // The engine handles the next bot response based on the detected intent
    await voxClient.channel.sendMessage({
        to: from,
        text: response.text
    });
    res.send('OK');
});
                    `}
                />
            </motion.div>
        </section>
        <Products />
        <HowItWorks />

        {/* Feature Grid Section - Core Capabilities */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.h2 variants={itemVariants} className="text-4xl font-extrabold text-center text-white mb-12">
                Core <span className="text-red-400">AI Modules</span>
            </motion.h2>
            <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
                <FeatureCard
                    icon="🧠"
                    title="Proprietary NLP Engine"
                    description="Industry-leading intent recognition, entity extraction, and sentiment analysis built for speed and accuracy."
                />
                <FeatureCard
                    icon="🔗"
                    title="Seamless CRM Integration"
                    description="Connect to Salesforce, HubSpot, or any custom API with secure middleware to fetch and update data."
                />
                <FeatureCard
                    icon="🏗️"
                    title="No-Code Flow Studio"
                    description="Drag-and-drop visual editor for designing complex conversations, business logic, and handoffs."
                />
                <FeatureCard
                    icon="📊"
                    title="Real-Time Analytics"
                    description="Monitor bot performance, track conversation abandonment, channel usage, and customer metrics in a unified dashboard."
                />
                <FeatureCard
                    icon="🗣️"
                    title="Voice/IVR Integration"
                    description="Convert your chat flows into natural-sounding voice interactions using advanced Text-to-Speech (TTS)."
                />
                <FeatureCard
                    icon="🧑‍💻"
                    title="Human Handoff"
                    description="Smooth escalation to a live agent in your unified inbox or external contact center (e.g., Genesys, Twilio)."
                />
            </motion.div>
        </section>

        {/* CTA Banner */}
        <motion.section
            variants={itemVariants}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16"
        >
            <div className="glassmorphism-card bg-slate-800 p-10 rounded-2xl flex flex-col md:flex-row items-center justify-between">
                <div className="md:max-w-xl">
                    <h3 className="text-3xl font-bold text-white mb-3">
                        Stop building NLP frameworks. Start engaging customers.
                    </h3>
                    <p className="text-red-300">
                        Our platform handles the complexity of language models, cross-channel deployment, and enterprise scale.
                    </p>
                </div>
                <GradientButton className="mt-6 md:mt-0 text-lg">
                    Schedule Integration Call
                </GradientButton>
            </div>
        </motion.section>
    </motion.div>
);

const FeaturesPage: React.FC = () => (
    <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen bg-slate-900"
    >
        <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold text-white mb-4 mt-8">
            The <span className="text-orange-400">Omnichannel</span> Advantage
        </motion.h1>
        <motion.p variants={itemVariants} className="text-lg text-slate-400 mb-12 max-w-3xl">
            A single conversational flow can be deployed everywhere. Manage all channels from one unified platform.
        </motion.p>

        <section className="space-y-10 pb-20">
            <motion.div variants={itemVariants} className="glassmorphism-card p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-semibold text-red-400 mb-3">WhatsApp & Messaging</h2>
                <ul className="grid md:grid-cols-2 gap-4 text-slate-300 text-sm">
                    <li><span className="text-orange-400 mr-2">✓</span> Official WhatsApp Business API Integration</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Rich Media Support (Buttons, Carousels)</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Template Message Management</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Conversation Window Handoff Logic</li>
                </ul>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glassmorphism-card p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-semibold text-red-400 mb-3">Voice Automation (IVR)</h2>
                <ul className="grid md:grid-cols-2 gap-4 text-slate-300 text-sm">
                    <li><span className="text-orange-400 mr-2">✓</span> Automatic Speech Recognition (ASR)</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Customizable Text-to-Speech (TTS) Voices</li>
                    <li><span className="text-orange-400 mr-2">✓</span> DTMF (Keypad) Input Handling</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Integration with SIP Trunks/Telco Providers</li>
                </ul>
            </motion.div>

            <motion.div variants={itemVariants} className="glassmorphism-card p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-semibold text-red-400 mb-3">Security & Compliance</h2>
                <ul className="grid md:grid-cols-2 gap-4 text-slate-300 text-sm">
                    <li><span className="text-orange-400 mr-2">✓</span> GDPR and CCPA Ready</li>
                    <li><span className="text-orange-400 mr-2">✓</span> HIPAA/HITECH Compliant Hosting</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Role-Based Access Control (RBAC)</li>
                    <li><span className="text-orange-400 mr-2">✓</span> Automated Data Masking</li>
                </ul>
            </motion.div>
        </section>
    </motion.div>
);

const IntegrationPage: React.FC = () => {
    // Defining a type for integration step for clarity
    type IntegrationStep = {
        title: string;
        description: string;
        code: string;
    };

    const integrationSteps: IntegrationStep[] = [
        {
            title: '1. Build Your Flow in Studio',
            description: 'Use the visual, no-code editor to map out intents, create responses, and define API calls for data enrichment.',
            code: `// Flow Studio Console Output
{
  "flowName": "Customer_Support_v3",
  "version": 3.1,
  "startNode": "Greetings",
  "intents": [
    { "name": "track_order", "model": "ML/v2/default" },
    { "name": "cancel_subscription", "model": "ML/v2/default" }
  ],
  "apiEndpoint": "/v1/flow/process"
}`
        },
        {
            title: '2. Deploy the Flow via API',
            description: 'Deploy the latest version of your flow instantly to all connected channels with a single API call.',
            code: `// Shell Command Example
$ curl -X POST 'https://api.voxdev.com/v1/deploy' \\
    -H 'Authorization: Bearer <API_TOKEN>' \\
    -d '{ "flowId": "support_bot", "targetChannels": ["whatsapp", "ivr", "web"] }'

// Response:
// { "status": "success", "message": "Flow deployed to 3 channels." }`
        },
        {
            title: '3. Integrate with Client SDK',
            description: 'For web or in-app chat, integrate our lightweight SDK to connect the frontend to the backend engine.',
            code: `// Web Chat Widget Initialization (Client-Side)
import { ChatWidget } from '@voxdev/web-sdk';

ChatWidget.init({
    flowId: 'support_bot',
    userId: 'current_user_id_123',
    theme: { accentColor: '#EF4444' },
    onHandoff: (session) => {
        console.log(\`Escalating to agent: \${session.agentId}\`);
    }
});

ChatWidget.render(document.getElementById('chat-container'));`
        },
    ];

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen pb-20 bg-slate-900"
        >
            <motion.div variants={itemVariants}>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 mt-8">
                    Flow Studio & <span className="text-red-400">Deployment API</span>
                </h1>
                <p className="text-lg text-slate-400 mb-12 max-w-4xl">
                    Whether you prefer a visual builder or pure code, our platform provides robust tools for every developer workflow.
                </p>
            </motion.div>

            <div className="space-y-16">
                {integrationSteps.map((step, index) => (
                    <motion.div key={index} variants={itemVariants} className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Description */}
                        <div>
                            <span className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Step {index + 1}</span>
                            <h2 className="text-3xl font-bold text-white mt-2 mb-4">{step.title}</h2>
                            <p className="text-slate-400">{step.description}</p>
                        </div>
                        {/* Code Block */}
                        <div>
                            <CodeBlock
                                language={index === 0 ? "JSON Config" : index === 1 ? "Shell/REST" : "JavaScript SDK"}
                                code={step.code}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div variants={itemVariants} className="text-center pt-20">
                <h2 className="text-3xl font-bold text-white mb-4">Focus on Conversation Design. We handle the Deployment.</h2>
                <GradientButton className="text-lg">View Detailed API Reference</GradientButton>
            </motion.div>
        </motion.div>
    );
};

const PricingPage: React.FC = () => {
    const pricingTiers: PricingTier[] = [
        {
            name: 'Prototyping',
            price: '$0',
            description: 'Ideal for testing, learning, and small personal projects. Start free forever.',
            features: ['10,000 Free Messages/mo', '1 Active Flow', 'Community Support', 'Web Chat Only'],
            buttonText: 'Start for Free',
            isPrimary: false
        },
        {
            name: 'Growth',
            price: '$399',
            description: 'For rapidly growing businesses needing multiple channels and enhanced performance.',
            features: ['50,000 Messages Included', 'Unlimited Flows & Bots', 'Omnichannel API Access', 'Priority SLA Support', 'Basic Analytics Dashboard'],
            buttonText: 'Select Growth Plan',
            isPrimary: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            description: 'Bespoke solutions for high-volume, security-critical, and customized deployments.',
            features: ['Custom Volume Pricing', 'Dedicated Hosting Cluster', 'Advanced NLP Customization', '24/7 Premium Support', 'IVR/Voice Integration'],
            buttonText: 'Contact Sales',
            isPrimary: false
        }
    ];

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen pb-20 bg-slate-900"
        >
            <motion.div variants={itemVariants} className="text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 mt-8">
                    Simple, <span className="text-orange-400">Predictable Pricing</span>
                </h1>
                <p className="text-lg text-slate-400 mb-12 max-w-3xl mx-auto">
                    Pricing is based on monthly active conversations and channels used. No complex contracts required.
                </p>
            </motion.div>

            <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
                {pricingTiers.map((tier, index) => (
                    <motion.div
                        key={index}
                        variants={itemVariants}
                        className={`glassmorphism-card p-8 rounded-2xl flex flex-col transition-all duration-300 ${tier.isPrimary ? 'border-2 border-red-500 shadow-2xl shadow-red-500/30' : 'border border-slate-700'}`}
                    >
                        <h2 className={`text-2xl font-bold mb-2 ${tier.isPrimary ? 'text-red-400' : 'text-white'}`}>{tier.name}</h2>
                        <p className="text-slate-400 mb-6 text-sm flex-grow">{tier.description}</p>
                        
                        <div className="flex items-end mb-8">
                            <span className="text-5xl font-extrabold text-white">{tier.price}</span>
                            {tier.price !== 'Custom' && <span className="text-xl text-slate-400 ml-1">/ mo</span>}
                        </div>

                        <GradientButton className="w-full mb-8 text-md" isOutline={!tier.isPrimary}>
                            {tier.buttonText}
                        </GradientButton>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Core Inclusions:</h3>
                            {tier.features.map((feature, i) => (
                                <p key={i} className="flex items-start text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-orange-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    {feature}
                                </p>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
};


// --- Main Application Component (App.tsx) ---
const App: React.FC = () => {
    // State for simulated client-side routing, explicitly typed as Page
    const [currentPage, setCurrentPage] = useState<Page>('Home');

    // Maps page names to their components, explicitly typed
    const pageComponents: Record<Page, React.FC> = {
        Home: HomePage,
        Features: FeaturesPage,
        SDKs: IntegrationPage,
        Pricing: PricingPage,
        Docs: IntegrationPage, // Docs route can point to the integration page for this simulation
        Contact: IntegrationPage, // Using IntegrationPage as a placeholder for Contact/Demo
    };

    // Safely retrieve the current page component
    const CurrentPage = pageComponents[currentPage] || HomePage;

    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentPage]);


    return (
        <div className="min-h-screen bg-slate-900 font-inter antialiased">
            {/* Global Background Glow/Gradient Effect */}
            <div className="fixed top-0 left-0 w-full h-[50vh] z-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-red-500/20 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
            </div>

            <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

            {/* Content Area with AnimatePresence for smooth page transitions */}
            <main className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                    >
                        <CurrentPage />
                    </motion.div>
                </AnimatePresence>
            </main>

            <Footer />
        </div>
    );
};

export default App;