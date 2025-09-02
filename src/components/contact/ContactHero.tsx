
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const ContactHero = () => {
  return (
    <div className="relative overflow-hidden pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-tr from-brand-purple/30 to-brand-blue/30 blur-3xl"
          style={{ width: "600px", height: "600px" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-6">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8">
            Ready to transform your customer interactions? Let's discuss how our AI assistants can help your business grow.
          </p>
          <Button size="lg" className="text-base">
            Schedule a Demo
          </Button>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <div className="text-center p-6 rounded-lg bg-white/50 backdrop-blur-sm border shadow-sm dark:bg-gray-900/50 dark:border-gray-800">
            <div className="w-12 h-12 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-brand-purple" />
            </div>
            <h3 className="font-semibold mb-2">Email Us</h3>
            <p className="text-gray-600 dark:text-gray-400">hello@voxioai.com</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-white/50 backdrop-blur-sm border shadow-sm dark:bg-gray-900/50 dark:border-gray-800">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-brand-blue" />
            </div>
            <h3 className="font-semibold mb-2">Call Us</h3>
            <p className="text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-white/50 backdrop-blur-sm border shadow-sm dark:bg-gray-900/50 dark:border-gray-800">
            <div className="w-12 h-12 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-brand-purple" />
            </div>
            <h3 className="font-semibold mb-2">Visit Us</h3>
            <p className="text-gray-600 dark:text-gray-400">San Francisco, CA</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-white/50 backdrop-blur-sm border shadow-sm dark:bg-gray-900/50 dark:border-gray-800">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-brand-blue" />
            </div>
            <h3 className="font-semibold mb-2">Business Hours</h3>
            <p className="text-gray-600 dark:text-gray-400">Mon-Fri, 9AM-6PM PST</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactHero;
