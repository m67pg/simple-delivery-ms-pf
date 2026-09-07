'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      // User is logged in, redirect to deliveries
      router.push('/deliveries');
    } else {
      // User is not logged in, redirect to login
      router.push('/login');
    }
  }, [router]);

  // Show loading screen while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">リダイレクト中...</p>
      </div>
    </div>
  );
}
