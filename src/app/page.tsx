import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          AI Personal Styling Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Discover your unique style through conversational AI and personalized analysis.
        </p>
        
        <div className="flex gap-4 justify-center mb-8">
          <Link href="/login">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/demo">
            <Button variant="outline" size="lg" className="px-8">
              View Demo
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Project Setup Complete ✅
          </h2>
          <div className="text-left space-y-2 text-sm text-gray-600">
            <p>✅ Next.js with TypeScript and Tailwind CSS</p>
            <p>✅ shadcn/ui component library</p>
            <p>✅ AWS SDK integration (Bedrock, DynamoDB, S3)</p>
            <p>✅ Style profile schemas and validation</p>
            <p>✅ Core interfaces and types</p>
            <p>✅ Error handling utilities</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Next Steps:</strong> Configure your AWS credentials in .env.local and proceed to implement the authentication and user management features.
          </p>
        </div>
      </div>
    </div>
  );
}