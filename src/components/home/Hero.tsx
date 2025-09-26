import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative overflow-hidden pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-tr from-brand-purple/30 to-brand-blue/30 blur-3xl"
          style={{ width: "600px", height: "600px" }}
        ></div>
        <div
          className="absolute top-1/2 right-1/4 -translate-y-1/2 transform rounded-full bg-gradient-to-tr from-brand-blue/20 to-brand-pink/20 blur-3xl"
          style={{ width: "800px", height: "800px" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-24 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="flex flex-col gap-6 max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading">
              Transform Customer Interactions with{" "}
              <span className="gradient-text">Intelligent AI Assistants</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
              Engage smarter with AI-powered chat and voice bots for your
              website and calls. Available 24/7, always helpful, infinitely
              scalable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              {/* <Button asChild size="lg" className="text-base">
                <Link to="/demo">Request a Demo</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link to="/">Explore Features</Link>
              </Button> */}
            </div>

            {/* Trusted By Section */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                TRUSTED BY INNOVATIVE COMPANIES
              </p>
              <div className="flex items-center h-full gap-x-8 gap-y-4">
                <div className="coursor-pointer text-gray-400 dark:text-gray-500">
                  <img
                    src={"./silver-wings-xr-logo.png"}
                    width="100"
                    height="150"
                    alt="Silver Wings XR"
                    className="coursor-pointer object-contain"
                  />
                </div>
                <div className="coursor-pointer text-gray-400 dark:text-gray-500">
                  <img
                    src={"./SIT.png"}
                    width="100"
                    height="150"
                    alt="Singapore Institute of Technology"
                    className="coursor-pointer object-contain"
                  />
                </div>
                <div className="coursor-pointer text-gray-400 dark:text-gray-500">
                  <img
                    src={"./MSF.png"}
                    width="100"
                    height="150"
                    alt="Ministry of Social and Family Development"
                    className="coursor-pointer object-contain"
                  />
                </div>
                <div className="coursor-pointer text-gray-400 dark:text-gray-500">
                  <img
                    src={"./voxa.png"}
                    width="100"
                    height="150"
                    alt="VOXA"
                    className="coursor-pointer object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-y-0 right-1/2 w-[200%] origin-bottom-left rounded-full bg-blue-50 blur-3xl dark:bg-blue-950/50"></div>
            </div>
            <div className="relative z-10 animate-float rounded-lg border bg-white/50 shadow-xl backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50">
              <div className="p-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs">
                      VA
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">Voxio Assistant</p>
                      <p className="text-xs text-gray-500">Online now</p>
                    </div>
                  </div>
                  {/* <div className="flex gap-1">
                    <button className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" x2="12" y1="19" y2="22"></line>
                      </svg>
                    </button>
                    <button className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                        <circle cx="12" cy="13" r="3"></circle>
                      </svg>
                    </button>
                  </div> */}
                </div>

                <div className="my-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs">
                      VA
                    </div>
                    <div className="rounded-lg rounded-tl-none bg-gray-100 px-4 py-2 dark:bg-gray-800">
                      <p className="text-sm">
                        Hello! How can I help you today?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-300 text-gray-800 flex items-center justify-center font-bold text-xs">
                      MJ
                    </div>
                    <div className="rounded-lg rounded-tl-none bg-gray-100 px-4 py-2 dark:bg-gray-800">
                      <p className="text-sm">
                        I'm interested in learning more about your chatbot
                        solution. How easy is it to set up?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs">
                      VA
                    </div>
                    <div className="rounded-lg rounded-tl-none bg-gray-100 px-4 py-2 dark:bg-gray-800">
                      <p className="text-sm">
                        Our chatbot is designed to be incredibly easy to set up!
                        It's a simple 3-step process:
                      </p>
                      <ol className="mt-2 ml-4 list-decimal text-sm">
                        <li>Integrate with a simple code snippet</li>
                        <li>Customize the appearance to match your brand</li>
                        <li>
                          Connect your knowledge base or let us build one for
                          you
                        </li>
                      </ol>
                      <p className="mt-2 text-sm">
                        Would you like me to schedule a demo for you?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-grow rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-gray-700 dark:bg-gray-800"
                    />
                    <button className="ml-2 rounded-full bg-brand-purple p-2 text-white hover:bg-purple-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 2-7 20-4-9-9-4Z"></path>
                        <path d="M22 2 11 13"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
