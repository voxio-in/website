import React from "react";
import Layout from "@/components/layout/Layout";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-12">
          {/* Header */}
          <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Privacy Policy
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
                1. Introduction
              </h2>
              <p className="mb-4">
                This Privacy Policy explains how VoxioAgents ("we", "us", or
                "our") collects, uses, discloses, and protects information when
                you use our Shopify app and chatbot service.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                2.1 Information from Merchants
              </h3>

              <div className="mb-4">
                <p className="font-semibold mb-2">Product Data:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Product names, descriptions, SKUs, and pricing</li>
                  <li>Product images and media files</li>
                  <li>Inventory levels and variants</li>
                  <li>Categories, collections, and tags</li>
                  <li>Custom product metafields</li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="font-semibold mb-2">Store Information:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Store name and URL</li>
                  <li>Basic store configuration</li>
                  <li>Theme information (for chatbot integration)</li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="font-semibold mb-2">Usage Data:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>App installation and configuration settings</li>
                  <li>Feature usage statistics</li>
                  <li>Performance metrics</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                2.2 Information from End-Users (Your Customers)
              </h3>
              <div className="mb-4">
                <p className="font-semibold mb-2">Chat Interaction Data:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Messages sent to the chatbot</li>
                  <li>Chatbot responses</li>
                  <li>Conversation timestamps</li>
                  <li>Session duration</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                2.3 Information We Do NOT Collect
              </h3>
              <p className="mb-2">We do not collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Customer names, email addresses, or contact information
                  (unless voluntarily provided in chat)
                </li>
                <li>Payment information</li>
                <li>Order history or purchase data</li>
                <li>Customer account credentials</li>
                <li>Precise geolocation data</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. How We Use Information
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                3.1 To Provide the Service
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  Create and maintain vector embeddings of product data in
                  Zilliz
                </li>
                <li>
                  Generate accurate chatbot responses using RAG technology
                </li>
                <li>Display the chatbot on your storefront</li>
                <li>Sync product updates to keep information current</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                3.2 To Improve the Service
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  Analyze conversation patterns to enhance response quality
                </li>
                <li>Identify and fix technical issues</li>
                <li>Develop new features and improvements</li>
                <li>Conduct aggregate analytics</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                3.3 To Communicate
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Send important service updates</li>
                <li>Provide customer support</li>
                <li>Notify you of new features or changes</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. How We Share Information
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                4.1 Service Providers
              </h3>
              <p className="mb-4">
                We share data with trusted third-party service providers:
              </p>

              <div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <p className="font-semibold">Zilliz (Vector Database):</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Stores product data in vector format</li>
                  <li>Provides similarity search capabilities</li>
                  <li>Data stored in encrypted databases</li>
                  <li>Location: aws-eu-central-1</li>
                </ul>

                <p className="font-semibold">Shopify:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Initial data synchronization</li>
                  <li>Ongoing product updates</li>
                  <li>Theme extension hosting</li>
                </ul>

                <p className="font-semibold">AI Model Providers:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Process chat queries for response generation</li>
                  <li>Data is not used to train models</li>
                  <li>No personal data is shared</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                4.2 Legal Requirements
              </h3>
              <p className="mb-2">
                We may disclose information if required by:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Valid legal process (subpoena, court order)</li>
                <li>Law enforcement requests</li>
                <li>Protection of our rights or safety</li>
                <li>Compliance with applicable laws</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                4.3 Business Transfers
              </h3>
              <p className="mb-4">
                In the event of a merger, acquisition, or sale of assets, your
                information may be transferred to the acquiring entity.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                4.4 We Never Sell Data
              </h3>
              <p className="mb-4">
                We do not sell, rent, or trade your data or your customers' data
                to third parties for marketing purposes.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Data Storage and Security
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                5.1 Storage Location
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  Product data is stored in Zilliz cloud infrastructure located
                  in aws-eu-central-1
                </li>
                <li>
                  Conversation logs are stored on secure servers in
                  us-central-1c
                </li>
                <li>
                  Backups are maintained in geographically separate locations
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                5.2 Security Measures
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>End-to-end encryption for data transmission</li>
                <li>Encrypted storage at rest using AES-256 encryption</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication for all systems</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                5.3 Retention Period
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Product data: Retained while the App is installed</li>
                <li>
                  Conversation logs: Retained for 90 days, then automatically
                  deleted
                </li>
                <li>Usage analytics: Aggregated data retained indefinitely</li>
                <li>
                  Upon app uninstallation: All data deleted within 30 days
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Your Rights and Choices
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                6.1 For Merchants
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  <strong>Access:</strong> Request a copy of all data we hold
                  about your store
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate
                  product information via your Shopify admin
                </li>
                <li>
                  <strong>Deletion:</strong> Uninstall the App to trigger data
                  deletion, or request immediate deletion
                </li>
                <li>
                  <strong>Export:</strong> Request a machine-readable export of
                  your data
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain types of data
                  processing
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                6.2 For End-Users
              </h3>
              <p className="mb-2">
                End-users should contact the Merchant (store owner) directly
                for:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Access to their chat conversation history</li>
                <li>Deletion of their conversation data</li>
                <li>Questions about how their data is used</li>
              </ul>
              <p className="mb-4">
                Merchants can contact us to facilitate these requests.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                6.3 How to Exercise Your Rights
              </h3>
              <p className="mb-2">
                Contact us at{" "}
                <a
                  href="mailto:voxioagents@gmail.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  voxioagents@gmail.com
                </a>{" "}
                with your:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Store URL</li>
                <li>Specific request</li>
                <li>Verification of your identity</li>
              </ul>
              <p className="mb-4">We will respond within 90 days.</p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Compliance with Privacy Laws
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                7.1 GDPR (European Union)
              </h3>
              <p className="mb-2">If you or your customers are in the EU:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>We act as a Data Processor; you are the Data Controller</li>
                <li>
                  We process data based on our contractual obligation to provide
                  the Service
                </li>
                <li>
                  We comply with data minimization, purpose limitation, and
                  storage limitation principles
                </li>
                <li>We provide data processing agreements upon request</li>
                <li>
                  We honor all GDPR rights including data portability and
                  erasure
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                7.2 CCPA (California)
              </h3>
              <p className="mb-2">
                If your customers are California residents:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>We do not sell personal information</li>
                <li>Consumers have the right to know what data is collected</li>
                <li>Consumers have the right to request deletion</li>
                <li>
                  We do not discriminate against users who exercise their rights
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">
                7.3 Other Jurisdictions
              </h3>
              <p className="mb-2">
                We comply with applicable data protection laws including:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Canada's PIPEDA</li>
                <li>Brazil's LGPD</li>
                <li>Australia's Privacy Act</li>
                <li>Other regional and national privacy regulations</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Children's Privacy
              </h2>
              <p className="mb-4">
                The App is not intended for use by children under 13 (or 16 in
                the EU). We do not knowingly collect information from children.
                If we discover we have collected such data, we will delete it
                immediately.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Cookies and Tracking
              </h2>
              <p className="mb-2">The chatbot uses:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>
                  Session cookies: To maintain conversation context (deleted
                  when browser closes)
                </li>
                <li>
                  Local storage: To remember user preferences and chat history
                  locally
                </li>
                <li>No third-party tracking cookies</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. International Data Transfers
              </h2>
              <p className="mb-4">
                If you are located outside aws-eu-central-1 , us-central-1c,
                your data may be transferred to and processed in
                aws-eu-central-1 , us-central-1c. We ensure appropriate
                safeguards are in place:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Standard Contractual Clauses (SCCs) for EU data</li>
                <li>Adequate protection measures as required by law</li>
                <li>Encryption during transfer</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. Changes to Privacy Policy
              </h2>
              <p className="mb-2">
                We may update this Privacy Policy to reflect:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Changes in our practices</li>
                <li>Legal or regulatory requirements</li>
                <li>New features or services</li>
              </ul>
              <p className="mb-2">Material changes will be communicated via:</p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Email notification to Merchants</li>
                <li>Prominent notice in the App</li>
                <li>At least 30 days before changes take effect</li>
              </ul>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                12. Contact Information
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold">
                    Data Protection Officer / Privacy Contact:
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
                </div>

                <div>
                  <p className="font-semibold">For Data Subject Requests:</p>
                  <p>
                    Email:{" "}
                    <a
                      href="mailto:voxioagents@gmail.com"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      voxioagents@gmail.com
                    </a>
                  </p>
                </div>

                <div>
                  <p className="font-semibold">For Security Issues:</p>
                  <p>
                    Email:{" "}
                    <a
                      href="mailto:voxioagents@gmail.com"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      voxioagents@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
