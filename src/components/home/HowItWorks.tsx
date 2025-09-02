import { CheckCircle } from "lucide-react";

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-heading">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Effortlessly integrate our AI solutions into your existing workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-xl mb-2">1. Choose Your Solution</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Select the AI assistant that fits your needs: Chatbot, VoiceBot, or Avatar.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-xl mb-2">2. Customize & Integrate</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Easily customize the appearance and integrate with your website or platform using our simple code snippet.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-xl mb-2">3. Deploy & Automate</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Deploy your AI assistant and start automating customer interactions, lead generation, and more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;