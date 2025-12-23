import React from "react";
import Layout from "@/components/layout/Layout";

const TermsOfService = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-12">
          {/* Header */}
          <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Terms of Use
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last Updated: December 22, 2025
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="mb-4">
                By installing and using VoxioAgents ("the App"), you
                ("Merchant", "you", or "your") agree to be bound by these Terms
                of Use. If you do not agree to these terms, do not install or
                use the App.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Service Description
              </h2>
              <p className="mb-2">
                The App provides an AI-powered chatbot service that:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  Collects product information from your Shopify store upon
                  installation
                </li>
                <li>
                  Creates and maintains a vector database of your product
                  catalog using Zilliz cloud infrastructure
                </li>
                <li>
                  Deploys a chatbot on your storefront via Shopify theme
                  extensions
                </li>
                <li>
                  Uses Retrieval Augmented Generation (RAG) technology to answer
                  customer inquiries about your products
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. Data Collection and Usage
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                3.1 Merchant Data
              </h3>
              <p className="mb-2">
                Upon installation, the App collects and processes:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Product names, descriptions, prices, and variants</li>
                <li>Product images and metadata</li>
                <li>Inventory information</li>
                <li>Product categories and tags</li>
                <li>Any custom product fields you have configured</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                3.2 End-User Data
              </h3>
              <p className="mb-2">The App collects from your store visitors:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Chat conversation content</li>
                <li>Timestamps of interactions</li>
                <li>Session identifiers (non-personally identifiable)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                3.3 Purpose of Data Processing
              </h3>
              <p className="mb-2">All data is processed solely to:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Provide accurate product information via the chatbot</li>
                <li>Improve response accuracy and relevance</li>
                <li>Maintain and optimize the vector database</li>
                <li>Generate usage analytics for the Merchant</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Merchant Responsibilities
              </h2>
              <p className="mb-2">You represent and warrant that:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  You have the legal right to share all product data with the
                  App
                </li>
                <li>
                  Your product descriptions do not violate any intellectual
                  property rights
                </li>
                <li>
                  You comply with all applicable laws regarding customer data
                  collection
                </li>
                <li>
                  You will maintain an appropriate privacy policy on your store
                  informing customers about the chatbot
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Intellectual Property
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                5.1 Your Content
              </h3>
              <p className="mb-4">
                You retain all ownership rights to your product data and
                content. By using the App, you grant us a limited, non-exclusive
                license to process and store your data solely for providing the
                Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                5.2 Our Technology
              </h3>
              <p className="mb-4">
                The App, including its chatbot technology, vector database
                implementation, and AI models, remains our exclusive property.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Data Security and Storage
              </h2>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  All data is stored in encrypted vector databases using Zilliz
                  cloud infrastructure
                </li>
                <li>
                  We implement industry-standard security measures to protect
                  your data
                </li>
                <li>
                  Data transmission occurs over secure, encrypted connections
                </li>
                <li>
                  Access to data is restricted to authorized personnel only
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Service Availability and Modifications
              </h2>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  We strive for 99.5% uptime but do not guarantee uninterrupted
                  service
                </li>
                <li>
                  We may modify, suspend, or discontinue any aspect of the
                  Service with 30 days notice
                </li>
                <li>Emergency maintenance may occur with minimal notice</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Limitations of Liability
              </h2>
              <p className="font-bold mb-2 uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4 uppercase">
                <li>
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND
                </li>
                <li>
                  WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR
                  CONSEQUENTIAL DAMAGES
                </li>
                <li>
                  OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR
                  THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM
                </li>
                <li>
                  WE ARE NOT RESPONSIBLE FOR THE ACCURACY OF AI-GENERATED
                  RESPONSES
                </li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Prohibited Uses
              </h2>
              <p className="mb-2">You may not:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Use the App for any illegal purposes</li>
                <li>
                  Attempt to reverse engineer or extract our proprietary
                  technology
                </li>
                <li>Use the App to collect data about competitors</li>
                <li>Overload or attempt to compromise our systems</li>
                <li>Violate any applicable data protection laws</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Termination
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                10.1 By You
              </h3>
              <p className="mb-4">
                You may uninstall the App at any time through your Shopify admin
                panel.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                10.2 By Us
              </h3>
              <p className="mb-4">
                We may suspend or terminate your access if you violate these
                Terms or engage in abusive behavior.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                10.3 Effect of Termination
              </h3>
              <p className="mb-2">Upon termination:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Your access to the App will cease immediately</li>
                <li>
                  Your data will be deleted within 30 days unless retention is
                  required by law
                </li>
                <li>
                  You may request an export of your data within 7 days of
                  termination
                </li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. Updates to Terms
              </h2>
              <p className="mb-4">
                We may update these Terms at any time. Material changes will be
                communicated via email or in-app notification at least 30 days
                before taking effect. Continued use of the App after changes
                constitute acceptance of new Terms.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                12. Governing Law
              </h2>
              <p className="mb-4">
                These Terms are governed by the laws of [Your Jurisdiction],
                without regard to conflict of law principles. Any disputes shall
                be resolved in the courts of [Your Jurisdiction].
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                13. Contact Information
              </h2>
              <p className="mb-2">
                For questions about these Terms, contact us at:
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:voxioagents@gmail.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  voxioagents@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService;
