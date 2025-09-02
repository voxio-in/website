
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
              Engage smarter with AI-powered chat and voice bots for your website and calls. Available 24/7, always helpful, infinitely scalable.
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
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="h-8 text-gray-400 dark:text-gray-500">
                  <svg className="h-full" viewBox="0 0 80 24" fill="currentColor">
                    <path d="M11.983 0h6.053V23.52h-6.053V0zM0 9.92h6.054v13.6H0V9.92zM3.027 0A3.027 3.027 0 0 1 6.054 3.027a3.027 3.027 0 0 1-6.054 0A3.027 3.027 0 0 1 3.027 0zm40.8 15.222c0 2.37 1.578 4.267 4.48 4.267 2.28 0 3.41-.988 4.267-2.245l4.853 2.245c-1.777 3.076-4.535 4.694-9.12 4.694-5.667 0-10.24-3.896-10.24-9.92S42.64 5.343 48.1 5.343c5.264 0 9.12 3.896 9.12 9.6 0 .64-.053 1.28-.107 1.922H43.827v-1.643zm9.654-3.84c0-2.424-1.737-4.267-4.373-4.267-2.637 0-4.374 1.843-4.374 4.267h8.747zM25.98 5.343c-2.02 0-3.734.72-5.08 2.448V5.823h-6.055V23.52h6.054V13.64c0-2.797 1.47-4.267 3.733-4.267 2.26 0 3.55 1.47 3.55 4.267v9.92h6.054v-9.92c0-5.534-3.413-8.297-8.257-8.297zm53.867 0c-2.02 0-3.734.72-5.08 2.448V5.823h-6.055V23.52h6.054V13.64c0-2.797 1.47-4.267 3.733-4.267 2.26 0 3.55 1.47 3.55 4.267v9.92H88V13.64c0-5.534-3.413-8.297-8.154-8.297z" />
                  </svg>
                </div>
                <div className="h-7 text-gray-400 dark:text-gray-500">
                  <svg className="h-full" viewBox="0 0 80 18" fill="currentColor">
                    <path d="M17.885 17.143H0V0h17.885v17.143zM5.97 11.264H3.944V7.5H2.126V5.714h1.818V3.572L5.97 2.679v3.035h2.92V7.5H5.97v3.764zm9.353-3.566c.606 0 1.061.446 1.061 1.125 0 .661-.404 1.125-1.162 1.125H10.06c.05 1.607 1.313 2.732 3.08 2.732.759 0 1.414-.152 2.126-.49v1.821c-.759.304-1.617.456-2.578.456-2.729 0-5.056-1.929-5.056-5.107 0-3.304 2.175-5.09 4.855-5.09 2.629 0 4.807 1.768 4.836 3.428zm-4.905-.66c.957 0 1.666-.49 1.666-1.34 0-.813-.71-1.321-1.666-1.321-1.011 0-1.869.508-1.869 1.322 0 .849.858 1.339 1.87 1.339zM38.116 0H26.71v17.143h11.407V0zM33.87 13.089c-.858 0-1.54-.196-2.15-.562v-2.053c.594.384 1.227.563 1.921.563 1.465 0 2.402-1 2.402-2.536V8.48c-.429.597-1.111.885-2.073.885-1.87 0-3.183-1.447-3.183-3.321 0-1.946 1.237-3.358 3.233-3.358.911 0 1.617.309 2.023.831V3.09h2.024v5.411c0 3-1.566 4.59-4.197 4.59zM33.122 7.5c.66 0 1.187-.348 1.187-.902v-.813c0-.58-.528-.902-1.187-.902-.76 0-1.288.321-1.288.902v.813c0 .554.528.902 1.288.902zm23.101-7.5H44.707v17.143h11.516V0zm-5.636 9.107c-2.327 0-4.095-1.714-4.095-4.09 0-2.17 1.87-4.09 4.095-4.09 2.224 0 4.095 1.92 4.095 4.09 0 2.376-1.768 4.09-4.095 4.09zm0-6.25c-1.11 0-2.022.868-2.022 2.16 0 1.428.911 2.16 2.022 2.16s2.022-.732 2.022-2.16c0-1.292-.911-2.16-2.022-2.16zM79.058 0h-11.46v17.143h11.46V0zm-5.738 9.107c-2.326 0-4.094-1.714-4.094-4.09 0-2.17 1.87-4.09 4.094-4.09s4.095 1.92 4.095 4.09c0 2.376-1.768 4.09-4.095 4.09zm0-6.25c-1.11 0-2.022.868-2.022 2.16 0 1.428.912 2.16 2.022 2.16 1.111 0 2.023-.732 2.023-2.16 0-1.292-.912-2.16-2.023-2.16zm-29.241 6.25c-2.326 0-4.095-1.714-4.095-4.09 0-2.17 1.87-4.09 4.095-4.09 2.224 0 4.095 1.92 4.095 4.09 0 2.376-1.768 4.09-4.095 4.09zm0-6.25c-1.111 0-2.023.868-2.023 2.16 0 1.428.912 2.16 2.023 2.16 1.11 0 2.022-.732 2.022-2.16 0-1.292-.911-2.16-2.022-2.16z" />
                  </svg>
                </div>
                <div className="h-5 text-gray-400 dark:text-gray-500">
                  <svg className="h-full" viewBox="0 0 80 15" fill="currentColor">
                    <path d="M8.54 14.69H6.325L3.113 6.404h-.033l-3.08 8.284H0L3.708 3.277h2.538l3.64 8.227h.034l3.64-8.227h2.504l-3.708 11.412h-2.18l-1.57-3.888h-.033l-1.536 3.888zM26.644 14.69h-2.538l-1.003-3.05h-5.537l-1.037 3.05h-1.939L19.589.082h2.437l4.618 14.606zm-3.91-4.652l-2.336-7.056h-.033l-2.37 7.056h4.74zM32.73 14.69h-2.215V1.653h-3.841V0h9.897v1.654h-3.84V14.69zM41.918 14.69h-2.215V0h2.215v14.69zM49.816 14.69h-4.853V0h4.217c3.08 0 5.295.943 5.295 3.888 0 1.48-.635 2.68-1.906 3.29v.034c1.738.541 2.74 1.855 2.74 3.938 0 2.354-1.738 3.54-5.493 3.54zm-.569-13.036h-2.069v4.215h2.134c1.973 0 3.08-.675 3.08-2.181 0-1.506-1.273-2.034-3.145-2.034zm.132 5.869h-2.201v5.513h2.302c1.839 0 3.212-.64 3.212-2.725 0-2.084-1.406-2.788-3.313-2.788zM62.932 14.69h-7.6V0h7.333v1.654h-5.118v4.518h4.853v1.654h-4.853v5.209h5.385v1.654zM73.318 2.388c-.501-.675-1.237-.943-2.134-.943-1.338 0-2.37.844-2.37 2.962v6.203c0 2.118 1.071 2.994 2.404 2.994.868 0 1.604-.27 2.1-.877V7.375h-2.607V5.72h4.82v9.296c-1.037.574-2.538.777-4.015.777-3.013 0-5.08-1.655-5.08-5.209V4.07C66.437.743 68.87 0 71.75 0c1.237 0 2.571.2 3.642.776l-2.067 1.612z" />
                  </svg>
                </div>
                <div className="h-7 text-gray-400 dark:text-gray-500">
                  <svg className="h-full" viewBox="0 0 80 19" fill="currentColor">
                    <path d="M79.75 15.195c-1.528.906-3.162 1.387-4.681 1.387-1.63 0-2.954-.51-3.925-1.387-1.02-.963-1.528-2.147-1.528-3.562 0-1.245.394-2.231 1.121-3.137.787-.906 1.769-1.529 3.01-1.927 1.3-.397 3.069-.708 5.272-.906 1.302-.114 2.164-.283 2.62-.51.459-.228.675-.51.675-.906v-.283c0-.962-.341-1.755-1.08-2.262-.68-.51-1.646-.765-2.835-.765-1.299 0-2.354.283-3.143.85-.788.566-1.121 1.387-1.121 2.574h-5.103c0-1.585.342-2.915 1.08-4.046.737-1.132 1.805-2.036 3.218-2.631C75.746.51 77.425.113 79.326.113c1.842 0 3.413.312 4.743.906 1.328.593 2.337 1.443 3.075 2.575.736 1.13 1.122 2.376 1.122 3.76v11.066h-4.847v-2.518c-.341.793-.818 1.47-1.43 1.982-.612.51-1.363.934-2.24 1.301zm-1.923-3.477c1.248 0 2.25-.368 3.053-.991.788-.623 1.194-1.415 1.194-2.32v-2.433c-.33.284-.915.51-1.63.623-.712.17-1.611.34-2.61.51-1.231.17-2.124.453-2.713.906-.588.397-.879.934-.879 1.556 0 .567.235 1.075.737 1.443.503.369 1.548.708 2.848.708v-.002zm-13.286 3.363c-.906 0-1.665-.227-2.26-.736-.593-.51-.901-1.245-.901-2.32V5.336h-2.655V1.316h2.655V-3.9h5.103v5.216h3.75v4.02h-3.75v6.207c0 .454.108.765.329.963.227.17.638.283 1.231.283h2.143v4.592h-5.645zM47.368.113c1.302 0 2.495.142 3.539.454 1.053.283 1.96.736 2.743 1.302.787.566 1.38 1.301 1.814 2.178.446.877.66 1.912.66 3.098 0 1.104-.158 2.064-.499 2.914-.342.85-.803 1.613-1.429 2.234a7.133 7.133 0 0 1-2.134 1.5c-.859.368-1.796.651-2.849.793l6.424 4.818h-7.005l-5.308-4.364h-.597v4.364h-5.103V.454h9.744zm-.422 4.648h-4.22v5.386h4.22c1.046 0 1.957-.255 2.691-.792.746-.537 1.106-1.245 1.106-2.122 0-.906-.36-1.613-1.106-2.15-.734-.53-1.645-.322-2.691-.322zM28.66.454h5.168l-6.752 18.941h-5.509L14.813.454h5.168l4.307 13.271h.066L28.66.454zM5.103.454h5.103v18.94H5.103V.454zM0 .454h1.359v18.94H0V.454z" />
                  </svg>
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
                    <div className="h-8 w-8 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs">VA</div>
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
                      <p className="text-sm">Hello! How can I help you today?</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-300 text-gray-800 flex items-center justify-center font-bold text-xs">MJ</div>
                    <div className="rounded-lg rounded-tl-none bg-gray-100 px-4 py-2 dark:bg-gray-800">
                      <p className="text-sm">
                        I'm interested in learning more about your chatbot solution. How easy is it to set up?
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs">
                      VA
                    </div>
                    <div className="rounded-lg rounded-tl-none bg-gray-100 px-4 py-2 dark:bg-gray-800">
                      <p className="text-sm">
                        Our chatbot is designed to be incredibly easy to set up! It's a simple 3-step process:
                      </p>
                      <ol className="mt-2 ml-4 list-decimal text-sm">
                        <li>Integrate with a simple code snippet</li>
                        <li>Customize the appearance to match your brand</li>
                        <li>Connect your knowledge base or let us build one for you</li>
                      </ol>
                      <p className="mt-2 text-sm">Would you like me to schedule a demo for you?</p>
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
