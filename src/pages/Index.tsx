
import Layout from "@/components/layout/Layout";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonial from "@/components/home/Testimonial";
import CtaSection from "@/components/home/CtaSection";

const Index = () => {
  return (
    <Layout>
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonial />
      <CtaSection />
    </Layout>
  );
};

export default Index;
