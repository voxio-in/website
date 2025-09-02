import { Button } from "@/components/ui/button";
import { MessageSquare, Mic, Phone, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Features = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-heading">
            Empower Your Business with AI-Driven Solutions
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Explore our key features designed to revolutionize customer interactions and streamline your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Chatbot Feature */}
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="w-12 h-12 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Intelligent Chatbots</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Provide instant support and personalized experiences with AI-powered chatbots.
            </p>
            <Button asChild variant="link" className="mt-4">
              <Link to="/products/chatbot">Learn More</Link>
            </Button>
          </div>

          {/* Website VoiceBot Feature */}
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Website VoiceBot</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Enable hands-free website navigation and interaction with voice commands.
            </p>
            <Button asChild variant="link" className="mt-4">
              <Link to="/products/website-voicebot">Learn More</Link>
            </Button>
          </div>

          {/* Call VoiceBot Feature */}
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="w-12 h-12 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center mb-4">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Call VoiceBot</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Automate and enhance phone support with AI-driven voice interactions.
            </p>
            <Button asChild variant="link" className="mt-4">
              <Link to="/products/call-voicebot">Learn More</Link>
            </Button>
          </div>

          {/* Avatar VoiceBot Feature */}
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="w-12 h-12 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-4">
              <UserCircle className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Avatar VoiceBot</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Create engaging and interactive experiences with AI avatars and voice technology.
            </p>
            <Button asChild variant="link" className="mt-4">
              <Link to="/products/avatar-voicebot">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;