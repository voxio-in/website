import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CtaSection = () => {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-gradient-to-r from-brand-purple to-brand-blue">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-brand-blue/10 to-brand-pink/10"></div>
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-brand-purple/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 bg-brand-blue/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6">
            Ready to Transform Your Customer Interactions?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Join forward-thinking companies that are already using Voxio AI to provide exceptional customer experiences.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="text-base">
              <Link to="/demo">Request a Demo</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
