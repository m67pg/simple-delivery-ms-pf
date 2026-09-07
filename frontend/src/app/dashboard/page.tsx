'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Delivery {
  id: number;
  status: string;
  recipient_address: string;
  notes: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export default function DashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await apiClient.get('/api/v1/deliveries');
      setDeliveries(response.data);
      console.log('配送データ:', response.data);
    } catch (err: any) {
      setError('配送データの取得に失敗しました');
      console.error('配送データ取得エラー:', err);
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Remove JWT token
    document.cookie = 'jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">配送管理ダッシュボード</h1>
            <Button onClick={handleLogout} variant="outline">
              ログアウト
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>配送一覧</CardTitle>
            <CardDescription>
              現在の配送状況を確認できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                配送データがありません
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="border rounded-lg p-4 bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          配送ID: {delivery.id}
                        </h3>
                        <p className="text-gray-600">
                          状態: <span className="font-medium">{delivery.status}</span>
                        </p>
                        <p className="text-gray-600">
                          配送先: {delivery.recipient_address}
                        </p>
                        {delivery.notes && (
                          <p className="text-gray-600">
                            メモ: {delivery.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>担当者: {delivery.user.name}</p>
                        <p>{delivery.user.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
