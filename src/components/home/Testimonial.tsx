const Testimonial = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <svg
            className="h-12 w-12 mx-auto mb-6 text-gray-400"
            fill="currentColor"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
          </svg>
          <blockquote>
            <p className="text-xl md:text-2xl font-medium text-gray-900 dark:text-white">
              "Adopting Voxio AI's voicebot and 3D avatar has fundamentally
              transformed our user engagement at Silverwings XR. The technology
              delivers a highly interactive and intuitive experience, driving
              our first-contact resolution up by over 65%. This has empowered
              our team to shift their focus from routine inquiries to
              high-value, complex projects, knowing our users are in capable
              hands. We were particularly impressed with the deployment speed;
              the team is very efficient. "
            </p>
          </blockquote>
          <div className="mt-10">
            <div className="flex items-center justify-center cursor-pointer">
              <a href="https://www.silverwingsxr.com/" target="_blank" rel="noopener noreferrer" className="flex items-center focus:outline-none">

              <div className="h-12 w-12 rounded-full bg-gray-300"></div>
              <div className="ml-4 text-left ">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  Kapil Chabria
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  CEO and Founder of SilverWings XR
                </p>
              </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
